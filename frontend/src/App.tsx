import React, { useState } from 'react';
import './App.css';

// PENTING: Ganti nilai ini dengan URL publik backend FastAPI Anda dari Localtunnel/Ngrok (Port 8000)
const API_BASE_URL = 'http://localhost:8000'; 

function App() {
  const [query, setQuery] = useState('');
  const [expandedQuery, setExpandedQuery] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [baseImageId, setBaseImageId] = useState('');
  const [addText, setAddText] = useState('');
  const [subtractText, setSubtractText] = useState('');

  const executeSemanticSearch = async (searchQuery: string) => {
    setLoading(true);
    setSuggestion('');
    try {
      const response = await fetch(`${API_BASE_URL}/search/semantic?query=${encodeURIComponent(searchQuery)}`, {
          // Kunci rahasia untuk melewati halaman peringatan keamanan Localtunnel
          headers: { 'Bypass-Tunnel-Reminder': 'true' }
      });
      const data = await response.json();
      setExpandedQuery(data.expanded_query);
      setResults(data.results);
      if (data.has_typo && data.corrected_query) {
         setSuggestion(data.corrected_query);
      }
    } catch (error) {
      console.error("Error searching:", error);
      alert("Gagal mengambil data pencarian semantik. Periksa console peramban Anda.");
    }
    setLoading(false);
  };

  const handleSemanticSearch = () => {
    executeSemanticSearch(query);
  };

  const handleSuggestionClick = () => {
    setQuery(suggestion);
    executeSemanticSearch(suggestion);
  }

  const handleCompositionalSearch = async () => {
    setLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/search/compositional`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Bypass-Tunnel-Reminder': 'true' // Kunci bypass
            },
            body: JSON.stringify({
                base_image_id: baseImageId,
                add_text: addText || null,
                subtract_text: subtractText || null
            })
        });
        const data = await response.json();
        if(response.ok) {
            setResults(data.results);
            setExpandedQuery('Compositional Search applied');
        } else {
            alert(data.detail);
        }
    } catch (error) {
        console.error(error);
        alert("Gagal memproses pencarian komposisional.");
    }
    setLoading(false);
  }

  const handleGetHeatmap = async (id: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/xai/heatmap?image_id=${encodeURIComponent(id)}&query=${encodeURIComponent(query || addText)}`, {
            headers: { 'Bypass-Tunnel-Reminder': 'true' }
        });
        const data = await response.json();
        alert(`XAI Heatmap Data generated for ${id}! Matrix shape: ${data.heatmap_shape[0]}x${data.heatmap_shape[1]}`);
    } catch (e) {
        console.error(e);
    }
  }

  return (
    <div className="App" style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>Advanced E-Commerce Search (NUI)</h1>
      <p style={{ color: 'gray' }}>Powered by CLIP, SAM, & Flan-T5</p>

      <div style={{ display: 'flex', gap: '40px', marginBottom: '30px' }}>
          <div style={{ flex: 1, padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>1. Situational & Semantic Reasoning</h3>
            <div style={{ marginBottom: '10px' }}>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Muddy outdoor wedding but elegant..."
                  style={{ width: '100%', padding: '10px', fontSize: '14px', boxSizing: 'border-box' }}
                />
            </div>
            {suggestion && (
                <p style={{ color: '#d9534f', margin: '0 0 10px 0', fontSize: '14px' }}>
                  Mungkin maksud Anda: <span style={{ cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }} onClick={handleSuggestionClick}>{suggestion}</span> ?
                </p>
            )}
            <button
              onClick={handleSemanticSearch}
              style={{ padding: '10px 20px', fontSize: '14px', cursor: 'pointer', width: '100%' }}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Search Semantically'}
            </button>
          </div>

          <div style={{ flex: 1, padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
            <h3>2. Compositional Search</h3>
            <input type="text" placeholder="Base Image ID (e.g. img_1)" value={baseImageId} onChange={e=>setBaseImageId(e.target.value)} style={{ width: '100%', marginBottom: '10px', padding: '8px', boxSizing: 'border-box' }}/>
            <input type="text" placeholder="Add Attribute (+ canvas, thick sole)" value={addText} onChange={e=>setAddText(e.target.value)} style={{ width: '100%', marginBottom: '10px', padding: '8px', boxSizing: 'border-box' }}/>
            <input type="text" placeholder="Subtract Attribute (- leather, formal)" value={subtractText} onChange={e=>setSubtractText(e.target.value)} style={{ width: '100%', marginBottom: '10px', padding: '8px', boxSizing: 'border-box' }}/>
            <button
              onClick={handleCompositionalSearch}
              style={{ padding: '10px 20px', fontSize: '14px', cursor: 'pointer', width: '100%', backgroundColor: '#4a90e2', color: 'white', border: 'none' }}
              disabled={loading || !baseImageId}
            >
              {loading ? 'Calculating Vectors...' : 'Manipulate Vector & Search'}
            </button>
          </div>
      </div>

      {expandedQuery && (
        <div style={{ padding: '15px', backgroundColor: '#e6ffe6', marginBottom: '20px', borderRadius: '5px' }}>
          <strong>Search Intent: </strong> <i>{expandedQuery}</i>
        </div>
      )}

      <div>
        <h2>Results Gallery</h2>
        {results.length === 0 && !loading && <p>No results found. (Index some images first)</p>}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {results.map((res, idx) => (
            <div key={idx} style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '8px', width: '220px', backgroundColor: 'white' }}>
              <div style={{ height: '150px', backgroundColor: '#eaeaea', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', position: 'relative' }}>
                <span style={{ color: '#888' }}>[Image {res.id}]</span>
              </div>
              <p style={{ margin: '0 0 5px' }}><strong>ID:</strong> {res.id}</p>
              <p style={{ margin: '0 0 10px' }}><strong>Score:</strong> {res.score.toFixed(4)}</p>

              <button onClick={() => handleGetHeatmap(res.id)} style={{ width: '100%', padding: '5px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>
                View XAI Heatmap
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
