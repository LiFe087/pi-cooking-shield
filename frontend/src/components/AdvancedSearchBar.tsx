// src/components/AdvancedSearchBar.tsx - FIXED: Compatible with new Icons
import React, { useState, useRef } from 'react';
import { Activity } from '../types';
import { 
  SearchIcon, 
  FilterIcon, 
  ClockIcon, 
  XIcon, 
  PulseIcon,
  AlertIcon,
  ShieldIcon,
  DenyIcon,
  AcceptIcon,
  ProtocolIcon,
  InterfaceIcon,
  PolicyIcon,
  FlagIcon
} from './Icons';

interface SearchFilter {
  field: string;
  operator: string;
  value: string;
}

interface AdvancedSearchBarProps {
  allActivities: Activity[];  // Todas las actividades sin filtrar
  onFilteredResultsChange: (results: Activity[]) => void;  // Callback para actualizar resultados
  onTimeRangeChange: (range: string) => void;
  placeholder?: string;
}

const AdvancedSearchBar: React.FC<AdvancedSearchBarProps> = ({ 
  allActivities,
  onFilteredResultsChange, 
  onTimeRangeChange, 
  placeholder = "Buscar eventos, amenazas, origen... (ej: 'malware origen:firewall')" 
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>(allActivities);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilter[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Predefined search suggestions
  const searchSuggestions = [
    'malware',
    'attack',
    'suspicious',
    'failed login',
    'ICMP',
    'ping',
    'source:firewall',
    'source:router',
    'severity:high',
    'severity:medium',
    'ip:192.168',
    'time:1h',
    'time:24h',
    'status:blocked',
    'status:allowed',
    'protocol:icmp'
  ];

  // Normaliza valores de tiempo (ej: "7d" a horas)
  const normalizeTimeValue = (value: string) => {
    if (value.endsWith('d')) {
      const days = parseInt(value);
      return (isNaN(days) ? 0 : days * 24);
    }
    if (value.endsWith('h')) {
      const hours = parseInt(value);
      return isNaN(hours) ? 0 : hours;
    }
    return parseInt(value) || 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    // Oculta sugerencias si el input está vacío
    if (value.length > 0) {
      const filtered = searchSuggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 6));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Función para obtener un mensaje amigable del log
  const getReadableMessage = (activity: Activity) => {
    const message = activity.message.toLowerCase();
    let readableMsg = '';

    const srcIp = message.match(/srcip=([^\s]+)/)?.[1] || '';
    const dstIp = message.match(/dstip=([^\s]+)/)?.[1] || '';
    const action = message.match(/action="([^"]+)/)?.[1] || '';
    const service = message.match(/service="([^"]+)/)?.[1] || '';
    const proto = message.match(/proto=([^\s]+)/)?.[1] || '';
    const type = message.match(/type="([^"]+)/)?.[1] || '';

    if (type === 'traffic') {
      readableMsg = `${action === 'accept' ? 'Se permitió' : 'Se bloqueó'} ${service ? `el servicio ${service}` : 'el tráfico'} 
        desde ${srcIp} hacia ${dstIp}${proto ? ` usando ${proto.toUpperCase()}` : ''}`;
    } else if (type === 'attack') {
      readableMsg = `Se detectó un intento de ataque desde ${srcIp}`;
    } else if (type === 'virus') {
      readableMsg = `Se detectó un virus en la comunicación entre ${srcIp} y ${dstIp}`;
    } else if (type === 'webfilter') {
      readableMsg = `Se ${action === 'accept' ? 'permitió' : 'bloqueó'} el acceso web desde ${srcIp}`;
    } else {
      readableMsg = `Actividad de red ${action} entre ${srcIp} y ${dstIp}`;
    }

    return readableMsg;
  };

  // Función para aplicar filtros a las actividades
  const applyFilters = (activities: Activity[], searchQuery: string, searchFilters: SearchFilter[]) => {
    let filtered = [...activities];
    
    // Aplicar búsqueda de texto
    if (searchQuery.trim()) {
      const searchTerms = searchQuery.toLowerCase().split(' ');
      filtered = filtered.filter((activity) => 
        searchTerms.some(term => 
          activity.message.toLowerCase().includes(term) ||
          activity.source.toLowerCase().includes(term) ||
          activity.status.toLowerCase().includes(term)
        )
      );
    }
    
    // Aplicar filtros
    searchFilters.forEach(filter => {
      const searchValue = filter.value.toLowerCase();
      switch (filter.field) {
        case 'severity':
          filtered = filtered.filter(activity => activity.status === searchValue);
          break;
        case 'source':
          filtered = filtered.filter(activity => activity.source.toLowerCase().includes(searchValue));
          break;
        case 'type':
          filtered = filtered.filter(activity => activity.message.toLowerCase().includes(`type="${searchValue}"`));
          break;
        // ... otros casos de filtrado
      }
    });
    
    return filtered;
  };

  const handleSearch = () => {
    setIsSearching(true);
    
    // Parse query for filters
    const parsedFilters: SearchFilter[] = [];
    let cleanQuery = query;

    // Extract filters from query (e.g., "source:firewall", "severity:high")
    const filterRegex = /([\w-]+):([\w-]+)/g;
    let match;
    while ((match = filterRegex.exec(query)) !== null) {
      parsedFilters.push({
        field: match[1],
        operator: 'equals',
        value: match[2].toLowerCase()
      });
      cleanQuery = cleanQuery.replace(match[0], '').trim();
    }

    // Normaliza y valida filtros de tiempo
    const normalizedFilters = [...parsedFilters, ...filters].map(f => {
      if (f.field === 'time') {
        return { ...f, value: normalizeTimeValue(f.value).toString() };
      }
      return f;
    }).filter(f => f.value); // Elimina filtros con valor vacío

    // Evita filtros duplicados
    const uniqueFilters = normalizedFilters.filter((f, idx, arr) =>
      arr.findIndex(x => x.field === f.field && x.value === f.value && x.operator === f.operator) === idx
    );

    // Aplicar filtros y actualizar resultados
    const results = applyFilters(allActivities, cleanQuery, uniqueFilters);
    setFilteredActivities(results);
    onFilteredResultsChange(results);
    setIsSearching(false);
    setShowSuggestions(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const addFilter = () => {
    const newFilter: SearchFilter = {
      field: 'protocol',
      operator: 'equals',
      value: 'icmp'
    };
    // Evita duplicados y valores vacíos
    if (!filters.some(f => f.field === newFilter.field && f.value === newFilter.value && f.operator === newFilter.operator) && newFilter.value) {
      const newFilters = [...filters, newFilter];
      setFilters(newFilters);
      const results = applyFilters(allActivities, query, newFilters);
      setFilteredActivities(results);
      onFilteredResultsChange(results);
    }
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, field: keyof SearchFilter, value: string) => {
    const updated = filters.map((filter, i) => 
      i === index ? { ...filter, [field]: value } : filter
    );
    setFilters(updated);
  };

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    onTimeRangeChange(range);
  };

  const clearAll = () => {
    setQuery('');
    setFilters([]);
    setFilteredActivities(allActivities);
    onFilteredResultsChange(allActivities);
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-4">
      {/* Main Search Input */}
      <div className="relative">
        <div className="flex items-center space-x-2">
          {/* Search Input */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon size={20} color="#9CA3AF" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md leading-5 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            
            {/* Clear button */}
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <XIcon size={16} color="#9CA3AF" />
              </button>
            )}
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center space-x-2">
            <ClockIcon size={20} color="#9CA3AF" />
            <select
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded border transition-colors ${
              showFilters 
                ? 'bg-blue-600 border-blue-500 text-white' 
                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <FilterIcon size={20} />
          </button>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors flex items-center space-x-2"
          >
            <SearchIcon size={16} />
            <span>Search</span>
          </button>
        </div>

        {/* Search Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-10">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-600 hover:text-white first:rounded-t-md last:rounded-b-md"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="space-y-3 pt-3 border-t border-gray-600">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-300">Advanced Filters</h4>
            <div className="flex space-x-2">
              <button
                onClick={addFilter}
                className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded border border-gray-600"
              >
                + Add Filter
              </button>
              {(filters.length > 0 || query) && (
                <button
                  onClick={clearAll}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Filter List */}
          {filters.map((filter, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 bg-gray-700 rounded border border-gray-600">
              <select
                value={filter.field}
                onChange={(e) => updateFilter(index, 'field', e.target.value)}
                className="bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm"
              >
                <option value="severity">Severity</option>
                <option value="source">Source</option>
                <option value="type">Type</option>
                <option value="subtype">Subtype</option>
                <option value="action">Action</option>
                <option value="service">Service</option>
                <option value="srcip">Source IP</option>
                <option value="dstip">Destination IP</option>
                <option value="srcport">Source Port</option>
                <option value="dstport">Destination Port</option>
                <option value="proto">Protocol</option>
                <option value="srcintf">Source Interface</option>
                <option value="dstintf">Destination Interface</option>
                <option value="devtype">Device Type</option>
                <option value="osname">OS Name</option>
                <option value="time">Time</option>
              </select>

              <select
                value={filter.operator}
                onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                className="bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm"
              >
                <option value="equals">equals</option>
                <option value="contains">contains</option>
                <option value="startswith">starts with</option>
                <option value="endswith">ends with</option>
              </select>

              <input
                type="text"
                value={filter.value}
                onChange={(e) => updateFilter(index, 'value', e.target.value)}
                placeholder="Value"
                className="flex-1 bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm"
              />

              <button
                onClick={() => removeFilter(index)}
                className="text-red-400 hover:text-red-300 p-1"
              >
                <XIcon size={16} />
              </button>
            </div>
          ))}

          {/* Quick Filters */}
          <div className="space-y-2">
            <p className="text-xs text-gray-400">Filtros Rápidos:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Logs de Tráfico', filter: { field: 'type', operator: 'equals', value: 'traffic' } },
                { label: 'Tráfico Bloqueado', filter: { field: 'action', operator: 'equals', value: 'deny' } },
                { label: 'Tráfico Permitido', filter: { field: 'action', operator: 'equals', value: 'accept' } },
                { label: 'HTTPS', filter: { field: 'service', operator: 'equals', value: 'HTTPS' } },
                { label: 'Dispositivos Android', filter: { field: 'devtype', operator: 'equals', value: 'Android Phone' } },
                { label: 'Puertos de Usuario', filter: { field: 'srcintf', operator: 'equals', value: 'User_Ports' } },
                { label: 'Tráfico WAN', filter: { field: 'dstintf', operator: 'equals', value: 'wan1' } },
                { label: 'Última Hora', filter: { field: 'time', operator: 'equals', value: '1h' } }
              ].map((quick, index) => (
                <button
                  key={index}
                  onClick={() => {
                    const newFilters = [...filters, quick.filter];
                    setFilters(newFilters);
                    const results = applyFilters(allActivities, query, newFilters);
                    setFilteredActivities(results);
                    onFilteredResultsChange(results);
                  }}
                  className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-300 px-2 py-1 rounded border border-gray-500"
                >
                  + {quick.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search Status and Results */}
      {(query || filters.length > 0) && (
        <>
          <div className="flex items-center justify-between pt-2 border-t border-gray-600">
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <PulseIcon size={8} color="#10B981" animate={true} />
              <span>
                Búsqueda activa: "{query}" 
                {filters.length > 0 && ` con ${filters.length} filtro${filters.length > 1 ? 's' : ''}`}
              </span>
            </div>
            <button
              onClick={handleSearch}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
            >
              Actualizar Resultados
            </button>
          </div>

          {/* Search Results Section */}
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Resultados de la Búsqueda</h3>
              <span className="text-sm text-gray-400">
                {filteredActivities.length} resultado{filteredActivities.length !== 1 ? 's' : ''} encontrado{filteredActivities.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Results List */}
            <div className="max-h-96 overflow-y-auto">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <PulseIcon size={40} color="#3B82F6" animate={true} />
                    <p className="text-gray-400 mt-4">Buscando...</p>
                  </div>
                </div>
              ) : filteredActivities.length === 0 ? (
                <div className="text-center py-8">
                  <SearchIcon size={48} color="#6B7280" />
                  <p className="text-gray-400 mt-4">No se encontraron resultados</p>
                </div>
              ) : (
                <>
                  {/* Filtros activos */}
                  <div className="mb-4 flex flex-wrap gap-2">
                    {filters.map((filter, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                        {filter.field === 'action' && <DenyIcon size={12} className="mr-1" />}
                        {filter.field === 'proto' && <ProtocolIcon size={12} className="mr-1" />}
                        {filter.field === 'srcintf' && <InterfaceIcon size={12} className="mr-1" />}
                        {filter.field === 'policyid' && <PolicyIcon size={12} className="mr-1" />}
                        {filter.field}={filter.value}
                        <button onClick={() => removeFilter(index)} className="ml-1 text-gray-400 hover:text-gray-300">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  
                  {/* Tabla de resultados */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead>
                        <tr className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                          <th className="px-3 py-2 text-left">Hora</th>
                          <th className="px-3 py-2 text-left">IP Origen</th>
                          <th className="px-3 py-2 text-left">Dispositivo</th>
                          <th className="px-3 py-2 text-left">Servicio</th>
                          <th className="px-3 py-2 text-left">País Destino</th>
                          <th className="px-3 py-2 text-left">Acción</th>
                          <th className="px-3 py-2 text-left">Política</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {filteredActivities.map((activity) => (
                          <tr 
                            key={activity.id}
                            className="hover:bg-gray-700/50 transition-colors text-sm"
                          >
                            <td className="px-3 py-2 text-gray-300 whitespace-nowrap">
                              {new Date(activity.timestamp).toLocaleString('es-MX', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false
                              })}
                            </td>
                            <td className="px-3 py-2 text-gray-300">{activity.src_ip}</td>
                            <td className="px-3 py-2 text-gray-300">
                              {activity.device_name} 
                              {activity.device_type && `(${activity.device_type})`}
                            </td>
                            <td className="px-3 py-2 text-gray-300">{activity.service}</td>
                            <td className="px-3 py-2 text-gray-300">
                              {activity.dst_country ? (
                                <span className="flex items-center">
                                  <FlagIcon size={12} className="mr-1" />
                                  {activity.dst_country}
                                </span>
                              ) : 'Local'}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                activity.action === 'deny' 
                                  ? 'bg-red-900 text-red-300' 
                                  : 'bg-green-900 text-green-300'
                              }`}>
                                {activity.action === 'deny' ? (
                                  <>
                                    <DenyIcon size={12} className="mr-1" />
                                    Deny
                                  </>
                                ) : (
                                  <>
                                    <AcceptIcon size={12} className="mr-1" />
                                    Accept
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-300">
                              {activity.src_interface || activity.policy_id || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdvancedSearchBar;