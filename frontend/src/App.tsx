import React, { useState } from 'react';
import './App.css';

const API_BASE_URL = ''; 

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
    setLoading(true); setSuggestion('');
    try {
      const response = await fetch(`${API_BASE_URL}/search/semantic?query=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setExpandedQuery(data.expanded_query);
      setResults(data.results);
      if (data.has_typo && data.corrected_query) setSuggestion(data.corrected_query);
    } catch (error) {
      alert("Gagal mengambil data pencarian semantik.");
    }
    setLoading(false);
  };

  const handleCompositionalSearch = async () => {
    setLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/search/compositional`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base_image_id: baseImageId, add_text: addText || null, subtract_text: subtractText || null })
        });
        const data = await response.json();
        if(response.ok) { setResults(data.results); setExpandedQuery('Compositional Search applied'); }
        else alert(data.detail);
    } catch (error) { alert("Gagal memproses pencarian komposisional."); }
    setLoading(false);
  };

  return (
    <div className="App" style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>Advanced E-Commerce Search (NUI)</h1>
      <div style={{ display: 'flex', gap: '40px', marginBottom: '30px' }}>
          <div style={{ flex: 1, padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>1. Situational & Semantic Reasoning</h3>
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Black shoes" style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
            <button onClick={() => executeSemanticSearch(query)} style={{ padding: '10px', width: '100%' }} disabled={loading}>{loading ? 'Processing...' : 'Search'}</button>
          </div>
          <div style={{ flex: 1, padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
            <h3>2. Compositional Search</h3>
            <input type="text" placeholder="Base Image ID" value={baseImageId} onChange={e=>setBaseImageId(e.target.value)} style={{ width: '100%', marginBottom: '10px', padding: '8px'}}/>
            <input type="text" placeholder="Add (+)" value={addText} onChange={e=>setAddText(e.target.value)} style={{ width: '100%', marginBottom: '10px', padding: '8px'}}/>
            <button onClick={handleCompositionalSearch} style={{ padding: '10px', width: '100%' }} disabled={loading}>Manipulate & Search</button>
          </div>
      </div>
      {expandedQuery && <div style={{ padding: '15px', backgroundColor: '#e6ffe6', marginBottom: '20px' }}><strong>Search Intent: </strong> <i>{expandedQuery}</i></div>}
      <h2>Results Gallery</h2>
      {results.length === 0 && !loading && <p>No results found.</p>}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {results.map((res, idx) => (
          <div key={idx} style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '8px', width: '220px' }}>
            <p><strong>ID:</strong> {res.id}</p><p><strong>Score:</strong> {res.score.toFixed(4)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
export default App;
