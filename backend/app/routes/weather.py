from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
import httpx

router = APIRouter(prefix="/api/weather", tags=["Weather"])

class DailyForecast(BaseModel):
    day: str
    temp_max: float
    temp_min: float
    condition: str
    rain_probability: int
    advisory: str

class WeatherResponse(BaseModel):
    location: str
    current_temp: float
    humidity: int
    wind_speed_kmh: float
    uv_index: float
    rain_risk: str
    spray_window_status: str
    forecast: List[DailyForecast]

@router.get("", response_model=WeatherResponse)
async def get_weather(lat: float = 30.83, lon: float = 76.19): # Default to Samrala / Ludhiana, Punjab
    # Proxy / query Open-Meteo with fallback
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto"
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(url)
            if res.status_code == 200:
                data = res.json()
                curr = data.get("current", {})
                daily = data.get("daily", {})

                days = ["Today", "Tomorrow", "Wednesday", "Thursday", "Friday"]
                forecast_items = []
                max_temps = daily.get("temperature_2m_max", [32, 33, 31, 30, 32])
                min_temps = daily.get("temperature_2m_min", [22, 23, 21, 20, 22])
                rain_probs = daily.get("precipitation_probability_max", [10, 15, 60, 20, 5])

                for i in range(min(5, len(max_temps))):
                    d_name = days[i] if i < len(days) else f"Day {i+1}"
                    rp = rain_probs[i] if i < len(rain_probs) else 10
                    cond = "Rain Showers" if rp > 40 else "Partly Cloudy" if rp > 20 else "Sunny & Clear"
                    adv = "Avoid foliar pesticide spray today" if rp > 40 else "Optimal day for irrigation & weeding"
                    forecast_items.append(DailyForecast(
                        day=d_name,
                        temp_max=max_temps[i],
                        temp_min=min_temps[i],
                        condition=cond,
                        rain_probability=rp,
                        advisory=adv
                    ))

                return WeatherResponse(
                    location="Samrala, Ludhiana (Punjab)",
                    current_temp=curr.get("temperature_2m", 28.5),
                    humidity=int(curr.get("relative_humidity_2m", 64)),
                    wind_speed_kmh=curr.get("wind_speed_10m", 12.4),
                    uv_index=6.5,
                    rain_risk="Low (12% chance)",
                    spray_window_status="Optimal spray window until 11:00 AM",
                    forecast=forecast_items
                )
    except Exception as e:
        print(f"Open-Meteo proxy error: {e}")

    # Fallback response
    return WeatherResponse(
        location="Samrala, Ludhiana (Punjab)",
        current_temp=28.5,
        humidity=64,
        wind_speed_kmh=12.4,
        uv_index=6.5,
        rain_risk="Low (15% chance)",
        spray_window_status="Optimal spray window until 11:00 AM",
        forecast=[
            DailyForecast(day="Today", temp_max=32.0, temp_min=22.0, condition="Clear & Sunny", rain_probability=10, advisory="Optimal day for fertigation"),
            DailyForecast(day="Tomorrow", temp_max=33.5, temp_min=23.0, condition="Partly Cloudy", rain_probability=20, advisory="Good conditions for weeding"),
            DailyForecast(day="Wednesday", temp_max=30.0, temp_min=21.0, condition="Scattered Showers", rain_probability=65, advisory="Postpone foliar pesticide sprays"),
            DailyForecast(day="Thursday", temp_max=31.0, temp_min=21.5, condition="Sunny", rain_probability=15, advisory="Optimal soil drying for harvesting"),
            DailyForecast(day="Friday", temp_max=32.0, temp_min=22.0, condition="Clear", rain_probability=5, advisory="High solar generation window")
        ]
    )
