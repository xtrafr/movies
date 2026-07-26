import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'grid',
          placeItems: 'center',
          minHeight: '100vh',
          background: '#010103',
          color: '#fff',
          fontFamily: 'Outfit, system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Something went wrong
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {this.state.error.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = '/'; }}
              style={{
                padding: '0.6rem 1.6rem',
                borderRadius: 100,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
