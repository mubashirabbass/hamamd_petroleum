import { Phone } from 'lucide-react';

export default function PrintHeader() {
  return (
    <div style={{ border: '4px double #111', padding: '2px', marginBottom: '10px', fontFamily: "'Times New Roman', serif" }}>
      <div style={{ border: '1.2px solid #111', padding: '12px 15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          {/* HR Logo */}
          <div style={{ width: 85, height: 85, flexShrink: 0 }}>
            <img 
              src="/assets/logo-hr.png" 
              alt="HR Logo"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
            />
          </div>

          {/* Business Details */}
          <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '28px', fontWeight: 1000, textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
              Hammad Rahim Filling Station
            </div>
            <div style={{ fontSize: '10px', fontWeight: 700, fontStyle: 'italic', textTransform: 'uppercase', color: '#444', marginTop: 4 }}>
              Muzafar Garh Road, Ada Ghyl Pur, District Jhang
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', textTransform: 'uppercase', fontSize: '9px', fontWeight: 1000, marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Phone style={{ width: 10, height: 10 }} />
                <span>+92-301-7221831</span>
              </div>
              <span style={{ color: '#111' }}>|</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Phone style={{ width: 10, height: 10 }} />
                <span>+92-300-0989192</span>
              </div>
            </div>
          </div>

          {/* GO Logo */}
          <div style={{ width: 85, height: 85, flexShrink: 0 }}>
            <img 
              src="/assets/logo-go.png" 
              alt="GO Logo"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
