export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to bottom right, #3b82f6, #1e40af)' }}>
      <div style={{ background: 'white', padding: '32px', borderRadius: '8px', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', textAlign: 'center', marginBottom: '32px' }}>Clock In</h1>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Email</label>
            <input
              type="text"
              placeholder="agent1@execo.test"
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Password</label>
            <input
              type="password"
              placeholder="password123"
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px' }}
            />
          </div>

          <button
            style={{ width: '100%', background: '#2563eb', color: 'white', fontWeight: '600', padding: '12px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
