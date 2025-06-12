import React, { useState } from 'react';

export default function SmartSearch() {
  const [query, setQuery] = useState('');
  const [progress, setProgress] = useState([]);
  const [products, setProducts] = useState([]);
  const [brand, setBrand] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    setLoading(true);
    setProgress(['Starting search...']);
    setProducts([]);
    setBrand('');
    setWebsite('');
    setError('');
    try {
      const res = await fetch(`/api/smart-search?q=${encodeURIComponent(query)}&debug=basic`);
      const data = await res.json();
      setProgress(data.progress || []);
      setProducts(data.products || []);
      setBrand(data.brand || '');
      setWebsite(data.website || '');
      setError(data.error || '');
    } catch (e) {
      setError('An error occurred during search.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg mt-8">
      <h2 className="text-2xl font-bold mb-4 text-blue-700">HS Code Smart Search</h2>
      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Enter company name (e.g. silvus)..."
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          onClick={handleSearch}
          disabled={loading}
        >
          Search
        </button>
      </div>
      {loading && (
        <div className="flex items-center gap-2 mb-4">
          <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <span className="text-blue-600 font-medium">Please wait, processing...</span>
        </div>
      )}
      {progress.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold text-gray-700 mb-1">Progress:</h3>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            {progress.map((msg, i) => <li key={i}>{msg}</li>)}
          </ul>
        </div>
      )}
      {error && <div className="text-red-600 font-semibold mb-4">{error}</div>}
      {brand && (
        <div className="mb-2">
          <span className="font-semibold text-gray-700">Brand:</span> <span className="text-blue-700">{brand}</span>
        </div>
      )}
      {website && (
        <div className="mb-2">
          <span className="font-semibold text-gray-700">Website:</span> <a href={website} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">{website}</a>
        </div>
      )}
      <h3 className="font-semibold text-gray-700 mt-4 mb-2">Products & Upgrades</h3>
      <ul className="divide-y divide-gray-200">
        {products.length === 0 && !loading && <li className="text-gray-400 italic">No products found.</li>}
        {products.map((p, i) => (
          <li key={i} className="py-2 flex justify-between items-center">
            <span className="text-gray-800">{p.name}</span>
            {p.category && (
              <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold
                ${p.category === 'upgrade' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                {p.category}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
