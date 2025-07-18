import React, { useState, useRef } from 'react';
import { SearchIcon, FilterIcon, ClockIcon, XIcon, PulseIcon } from './Icons';

interface SearchFilter {
  field: string;
  operator: string;
  value: string;
}

interface AdvancedSearchBarProps {
  onSearch: (query: string, filters: SearchFilter[]) => void;
  onTimeRangeChange: (range: string) => void;
}

const AdvancedSearchBar: React.FC<AdvancedSearchBarProps> = ({ onSearch, onTimeRangeChange }) => {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeFilters, setActiveFilters] = useState<SearchFilter[]>([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Search suggestions like Splunk
  const searchSuggestions = [
    'source:fortigate AND severity:high',
    'ip:192.168.1.* AND action:denied',
    'attack OR malware OR virus',
    'failed_login AND time:last_1h',
    'port_scan AND country:China',
    'severity:critical AND NOT source:internal'
  ];

  const quickFilters = [
    { label: 'High Severity', field: 'severity', operator: '=', value: 'high' },
    { label: 'External IPs', field: 'ip_type', operator: '=', value: 'external' },
    { label: 'Failed Events', field: 'status', operator: '=', value: 'failed' },
    { label: 'Last Hour', field: 'time', operator: '>', value: '1h' }
  ];

  const timeRanges = [
    { label: 'Last 15 minutes', value: '15m' },
    { label: 'Last hour', value: '1h' },
    { label: 'Last 24 hours', value: '24h' },
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' }
  ];

  const handleSearch = async () => {
    setIsSearching(true);
    onSearch(query, activeFilters);
    setShowSuggestions(false);
    
    // Simulate search delay for animation
    setTimeout(() => setIsSearching(false), 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const addQuickFilter = (filter: SearchFilter) => {
    const exists = activeFilters.some(f => 
      f.field === filter.field && f.operator === filter.operator && f.value === filter.value
    );
    
    if (!exists) {
      const newFilters = [...activeFilters, filter];
      setActiveFilters(newFilters);
      onSearch(query, newFilters);
    }
  };

  const removeFilter = (index: number) => {
    const newFilters = activeFilters.filter((_, i) => i !== index);
    setActiveFilters(newFilters);
    onSearch(query, newFilters);
  };

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    onTimeRangeChange(range);
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6 animate-fadeIn">
      {/* Main Search Bar */}
      <div className="relative">
        <div className="flex items-center space-x-2">
          {/* Search Input */}
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <SearchIcon 
                size={20} 
                color="#9CA3AF" 
                className="transition-colors duration-200"
              />
            </div>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Search logs... (e.g., source:fortigate AND severity:high)"
              className="w-full pl-12 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200 hover-glow"
            />
            
            {/* Search Suggestions Dropdown */}
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto animate-scaleIn">
                {searchSuggestions
                  .filter(suggestion => 
                    suggestion.toLowerCase().includes(query.toLowerCase()) || query === ''
                  )
                  .map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setQuery(suggestion);
                        setShowSuggestions(false);
                        searchRef.current?.focus();
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-600 text-gray-300 text-sm border-b border-gray-600 last:border-b-0 transition-colors duration-150 hover-lift"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-400">💡</span>
                        <span>{suggestion}</span>
                      </div>
                    </button>
                  ))
                }
              </div>
            )}
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center space-x-2">
            <ClockIcon size={20} color="#9CA3AF" />
            <select
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-all duration-200"
            >
              {timeRanges.map(range => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 hover-scale"
          >
            {isSearching ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Searching...</span>
              </>
            ) : (
              <>
                <SearchIcon size={20} color="white" />
                <span>Search</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="mt-4 animate-slideIn">
        <div className="flex items-center space-x-2 mb-2">
          <FilterIcon size={16} color="#9CA3AF" />
          <span className="text-sm text-gray-400 font-semibold">Quick Filters:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickFilters.map((filter, index) => (
            <button
              key={index}
              onClick={() => addQuickFilter(filter)}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-full text-sm border border-gray-600 transition-all duration-200 hover:border-blue-500 hover-lift"
            >
              + {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="mt-4 animate-slideIn">
          <div className="flex items-center space-x-2 mb-2">
            <FilterIcon size={16} color="#3B82F6" />
            <span className="text-sm text-blue-400 font-semibold">Active Filters:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 px-3 py-1 bg-blue-900 text-blue-200 rounded-full text-sm border border-blue-700 animate-scaleIn hover-lift"
              >
                <span>{filter.field} {filter.operator} {filter.value}</span>
                <button
                  onClick={() => removeFilter(index)}
                  className="hover:text-white transition-colors duration-150"
                >
                  <XIcon size={14} color="currentColor" />
                </button>
              </div>
            ))}
            
            {/* Clear All Filters */}
            <button
              onClick={() => {
                setActiveFilters([]);
                onSearch(query, []);
              }}
              className="px-3 py-1 bg-red-900 text-red-200 rounded-full text-sm border border-red-700 hover:bg-red-800 transition-all duration-200 hover-lift"
            >
              🗑️ Clear All
            </button>
          </div>
        </div>
      )}

      {/* Search Stats */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-400 border-t border-gray-700 pt-3">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-2">
            <SearchIcon size={16} color="#9CA3AF" />
            <span>Search across all security events</span>
          </span>
          <span className="flex items-center space-x-2">
            <FilterIcon size={16} color="#9CA3AF" />
            <span>Real-time filtering</span>
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <PulseIcon size={8} color="#10B981" animate={true} />
          <span>Auto-refresh: ON</span>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearchBar;