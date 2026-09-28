from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class MongoDBManager:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None

mongodb_manager = MongoDBManager()

async def connect_to_mongodb() -> bool:
    """Connect to MongoDB on app startup if DB_TYPE is mongodb or configured."""
    try:
        if not settings.MONGODB_URL:
            logger.info("MongoDB URL not configured.")
            return False
            
        mongodb_manager.client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=3000
        )
        mongodb_manager.db = mongodb_manager.client[settings.MONGODB_DB_NAME]
        
        # Test connection ping
        await mongodb_manager.client.admin.command('ping')
        logger.info(f"Connected to MongoDB database: {settings.MONGODB_DB_NAME}")
        return True
    except Exception as e:
        logger.warning(f"MongoDB connection skipped or unavailable: {e}")
        return False

async def close_mongodb_connection():
    """Close MongoDB connection on app shutdown."""
    if mongodb_manager.client:
        mongodb_manager.client.close()
        logger.info("Closed MongoDB connection.")

def get_mongodb() -> AsyncIOMotorDatabase | None:
    """Dependency / Helper to retrieve current MongoDB database instance."""
    return mongodb_manager.db

def get_collection(name: str):
    """Retrieve a specific MongoDB collection."""
    if mongodb_manager.db is not None:
        return mongodb_manager.db[name]
    return None
