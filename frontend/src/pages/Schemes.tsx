import React, { useEffect, useState } from 'react';
import { GovtScheme } from '../types';
import { ExternalLink, CheckCircle, FileText, X, Landmark, Award, ShieldCheck, ChevronRight } from 'lucide-react';

interface RichScheme {
  id: string;
  short_code: string;
  name: string;
  category: string;
  ministry: string;
  benefit: string;
  eligibility: string;
  documents: string[];
  summary: string;
  steps: string[];
  apply_url: string;
  portal_name: string;
}

export const SchemesPage: React.FC = () => {
  const [selectedScheme, setSelectedScheme] = useState<RichScheme | null>(null);

  const officialSchemes: RichScheme[] = [
    {
      id: 'pm-kisan',
      short_code: 'PM-KISAN',
      name: 'Pradhan Mantri Kisan Samman Nidhi',
      category: 'Direct Income Support',
      ministry: 'Ministry of Agriculture & Farmers Welfare',
      benefit: '₹6,000 per year directly transferred to bank account in 3 equal instalments of ₹2,000',
      eligibility: 'All landholding farmer families with cultivable landholding. Excludes institutional landholders and income tax payees.',
      documents: ['Aadhaar Card linked to active bank account', 'Land Revenue Records (Khatauni/Jamabandi/7-12)', 'Active mobile number for OTP e-KYC', 'Bank Passbook with IFSC code'],
      summary: 'Central Sector Scheme providing 100% financial assistance directly to small and marginal farmer families. Ensures supplementary cash flow for procuring high-yield seeds, fertilizers, and addressing seasonal cultivation expenditures.',
      steps: [
        'Visit the official PM-KISAN portal (pmkisan.gov.in) and click "New Farmer Registration".',
        'Enter Aadhaar number and state, verify mobile OTP.',
        'Enter land details (Khasra, Khatauni number) and bank account details.',
        'Complete mandatory e-KYC via Aadhaar OTP or biometric verification at CSC.'
      ],
      portal_name: 'pmkisan.gov.in',
      apply_url: 'https://pmkisan.gov.in/'
    },
    {
      id: 'pmfby',
      short_code: 'PMFBY',
      name: 'Pradhan Mantri Fasal Bima Yojana',
      category: 'Crop Insurance',
      ministry: 'Ministry of Agriculture & Farmers Welfare',
      benefit: 'Comprehensive crop insurance against drought, flood, unseasonal storm, and pest loss at only 2% premium (Kharif) / 1.5% (Rabi)',
      eligibility: 'All farmers growing notified crops in notified areas, including sharecroppers and tenant farmers.',
      documents: ['Land Ownership Document / Tenant Declaration', 'Sowing Certificate from Patwari/Village Officer', 'Bank Passbook / Cancelled Cheque', 'Aadhaar Card'],
      summary: 'Protects farmer income against unavoidable non-preventable natural calamities. Covers loss from prevented sowing, localized calamities (hailstorm, inundation, cloudburst), mid-season adversity, and post-harvest losses up to 14 days after harvest.',
      steps: [
        'Open pmfby.gov.in or download the Crop Insurance Mobile App.',
        'Click "Farmer Corner" and register with mobile and Aadhaar.',
        'Select State, District, Sub-district, Crop, and Sowing Date.',
        'Pay your nominal 2% or 1.5% farmer share online to receive instant policy certificate.'
      ],
      portal_name: 'pmfby.gov.in',
      apply_url: 'https://pmfby.gov.in/'
    },
    {
      id: 'pm-kusum',
      short_code: 'PM-KUSUM',
      name: 'Solar Irrigation Pump Subsidy Scheme',
      category: 'Solar Energy & Irrigation',
      ministry: 'Ministry of New and Renewable Energy (MNRE)',
      benefit: 'Up to 60% government subsidy (30% Central + 30% State) + 30% bank loan for standalone or grid-connected solar pumps',
      eligibility: 'Individual farmers, cooperatives, Panchayats, Farmer Producer Organizations (FPOs), and water user associations.',
      documents: ['Aadhaar Card', 'Land ownership proof with water source access', 'Bank Account details', 'Quotation from authorized solar vendor'],
      summary: 'Enables farmers to install solar water pumping systems (3 HP to 10 HP) and solarize existing grid/diesel agricultural pumps. Farmers achieve zero electricity/diesel bills and can sell surplus solar power back to the grid for extra passive revenue.',
      steps: [
        'Visit the national KUSUM portal or your state nodal renewable energy agency (e.g. MEDA, PEDA, HAREDA).',
        'Select Component B (Standalone Solar Pump) or Component C (Solarization of Grid Pump).',
        'Fill in agricultural land acreage and required pump horsepower capacity.',
        'Deposit the 10% farmer contribution once the state subsidy sanction letter is generated.'
      ],
      portal_name: 'pmkusum.mnre.gov.in',
      apply_url: 'https://pmkusum.mnre.gov.in/'
    },
    {
      id: 'pmksy',
      short_code: 'PMKSY',
      name: 'Per Drop More Crop (Micro-Irrigation)',
      category: 'Water Conservation',
      ministry: 'Department of Agriculture & Farmers Welfare',
      benefit: '45% to 55% capital subsidy on Drip and Sprinkler irrigation systems to conserve water and boost yields by 30-50%',
      eligibility: 'All farmers possessing cultivable land with a dedicated water source (tubewell, canal outlet, or farm pond). Small and marginal farmers receive the highest 55% subsidy.',
      documents: ['Land Record / Khasra-Khatauni', 'Aadhaar Card & Photo', 'Water Source Certificate / Electricity bill', 'Field layout map from certified micro-irrigation engineer'],
      summary: 'Focuses on precision water efficiency through micro-irrigation systems. Slashes irrigation water usage by 30-50%, cuts electricity bills, minimizes weed growth, and enables automated fertigation directly to plant root zones.',
      steps: [
        'Access pmksy.gov.in or your State Horticulture / Agriculture Department portal.',
        'Register land survey number and crop type.',
        'Select empanelled micro-irrigation vendor (Jain Irrigation, Netafim, etc.).',
        'Vendor conducts GPS field survey and submits design for immediate government subsidy release.'
      ],
      portal_name: 'pmksy.gov.in',
      apply_url: 'https://pmksy.gov.in/'
    },
    {
      id: 'kcc',
      short_code: 'KCC',
      name: 'Kisan Credit Card Scheme',
      category: 'Low Interest Credit',
      ministry: 'Department of Financial Services & RBI',
      benefit: 'Crop loans up to ₹3 Lakh at an effective interest rate of only 4% (7% base minus 3% prompt repayment incentive)',
      eligibility: 'All farmers, individual/joint borrowers, tenant farmers, sharecroppers, and self-help groups (SHGs) engaged in agriculture or allied animal husbandry/fisheries.',
      documents: ['Duly filled one-page KCC application form', 'Identity and Address proof (Aadhaar/Voter ID)', 'Land title records certified by revenue authority', 'No-dues certificate or declaration'],
      summary: 'Ensures farmers do not fall into informal moneylender debt traps. Provides flexible revolving cash credit for buying certified seeds, fertilizers, tractor fuel, crop maintenance, and post-harvest storage.',
      steps: [
        'Download the standard one-page KCC form from your bank or myscheme.gov.in.',
        'Submit the form along with land records to your nearest commercial, regional rural, or cooperative bank.',
        'Banks are mandated to issue the KCC card within 14 working days without collateral up to ₹1.60 Lakh.'
      ],
      portal_name: 'myscheme.gov.in',
      apply_url: 'https://www.myscheme.gov.in/schemes/kcc'
    },
    {
      id: 'soil-health',
      short_code: 'SHC',
      name: 'National Soil Health Card Scheme',
      category: 'Soil Nutrient Science',
      ministry: 'Department of Agriculture & Farmers Welfare',
      benefit: 'Free scientific laboratory testing of 12 soil parameters (NPK, pH, EC, Organic Carbon) every 2 years',
      eligibility: 'All farmers across all agroclimatic zones in India.',
      documents: ['Aadhaar Card', 'GPS coordinates or survey number of farm plot'],
      summary: 'Empowers farmers with scientific fertilizer recommendations tailored to their exact soil condition. Prevents excessive and costly urea application, restores native soil microflora, and optimizes crop nutrient absorption.',
      steps: [
        'Open soilhealth.dac.gov.in.',
        'Track your soil sample status by entering state, district, sub-district, and farmer name.',
        'Download and print the Soil Health Card containing customized fertilizer dosage for your specific crops.'
      ],
      portal_name: 'soilhealth.dac.gov.in',
      apply_url: 'https://soilhealth.dac.gov.in/'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Government Schemes & Financial Subsidies</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Click any scheme card below to inspect full eligibility criteria, required documents, and open the official government portal.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {officialSchemes.map((s) => (
          <div
            key={s.id}
            onClick={() => setSelectedScheme(s)}
            className="agri-card"
            style={{
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              transition: 'transform 0.15s ease, border-color 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge badge-success" style={{ marginBottom: '6px' }}>{s.short_code}</span>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{s.name}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{s.category} • {s.ministry}</p>
              </div>
            </div>

            <div style={{ background: '#17221b', padding: '12px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Financial Benefit</span>
              <p style={{ fontSize: '0.9rem', color: '#f1f5f3', fontWeight: 500 }}>{s.benefit}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <div>
                <strong style={{ color: 'var(--text-main)' }}>Eligibility: </strong>
                {s.eligibility}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: '#10b981', fontWeight: 600 }}>
              <a
                href={s.apply_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#34d399',
                  textDecoration: 'none',
                  fontWeight: 700
                }}
              >
                {s.id === 'kcc' ? 'Click Here to Apply (KCC) ↗' : 'Official Portal ↗'}
              </a>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                Criteria <ChevronRight size={16} />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Scheme Detail Modal */}
      {selectedScheme && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="agri-card" style={{
            maxWidth: '620px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: '#0e1712',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge badge-success" style={{ marginBottom: '6px' }}>{selectedScheme.short_code}</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{selectedScheme.name}</h3>
                <span style={{ fontSize: '0.8rem', color: '#10b981' }}>{selectedScheme.ministry}</span>
              </div>
              <button
                onClick={() => setSelectedScheme(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '10px',
              padding: '12px 16px'
            }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#34d399', fontWeight: 700 }}>
                Financial Benefit & Subsidy
              </span>
              <p style={{ fontSize: '0.92rem', color: '#f1f5f3', marginTop: '4px', lineHeight: 1.5, fontWeight: 600 }}>
                {selectedScheme.benefit}
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '6px' }}>Scheme Overview</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {selectedScheme.summary}
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '6px' }}>Who Qualifies & Exclusions</h4>
              <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
                {selectedScheme.eligibility}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '6px' }}>Mandatory Documents Checklist</h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                {selectedScheme.documents.map((doc, i) => (
                  <li key={i}><strong style={{ color: '#10b981' }}>✓</strong> {doc}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '6px' }}>Step-by-Step Application Guide</h4>
              <ol style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {selectedScheme.steps.map((st, i) => (
                  <li key={i}>{st}</li>
                ))}
              </ol>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', gap: '10px' }}>
              <a
                href={selectedScheme.apply_url}
                target="_blank"
                rel="noreferrer"
                className="agri-btn-primary"
                style={{ flex: 1, justifyContent: 'center', textDecoration: 'none', padding: '12px', fontWeight: 700 }}
              >
                {selectedScheme.id === 'kcc' ? 'Click Here to Apply (Official KCC Portal)' : `Open Official Portal (${selectedScheme.portal_name})`} <ExternalLink size={16} />
              </a>
              <button
                onClick={() => setSelectedScheme(null)}
                className="agri-btn-outline"
                style={{ padding: '12px 18px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SchemesPage;
