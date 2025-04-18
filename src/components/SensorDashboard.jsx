import React, { useEffect, useState } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { gql } from '@apollo/client';

// Query to get ALL sensor data
const LIST_SENSORS_DATA = gql`
  query ListSensorsData($nextToken: String) {
    listSensorsData(limit: 1000, nextToken: $nextToken) {
      items {
        device_id
        timestamp
        temperature
        humidity
        battery_voltage
        move_count
        field_2
        received_at
      }
      nextToken
    }
  }
`;

// Subscription for real-time updates
const ON_CREATE_SENSORS_DATA = gql`
  subscription OnCreateSensorsData {
    onCreateSensorsData {
      device_id
      timestamp
      temperature
      humidity
      battery_voltage
      move_count
      field_2
      received_at
    }
  }
`;

export default function SensorDashboard() {
  const [sensorData, setSensorData] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [devices, setDevices] = useState(new Set());
  const [dateRange, setDateRange] = useState('all'); // 'all', 'day', 'week', 'month'

  // Query with no limit to get all historical data
  const { loading, error, data, fetchMore } = useQuery(LIST_SENSORS_DATA, {
    variables: { limit: 1000 },
    fetchPolicy: 'network-only',
  });

  // Subscription for real-time updates
  const { data: subData } = useSubscription(ON_CREATE_SENSORS_DATA);

  // Function to load all data using pagination
  const loadAllData = async (initialData) => {
    let allItems = [...(initialData?.listSensorsData?.items || [])];
    let nextToken = initialData?.listSensorsData?.nextToken;

    while (nextToken) {
      const result = await fetchMore({
        variables: { nextToken },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return fetchMoreResult;
        },
      });
      allItems = [...allItems, ...(result.data?.listSensorsData?.items || [])];
      nextToken = result.data?.listSensorsData?.nextToken;
    }

    return allItems;
  };

  // Process and format data
  const processData = (items) => {
    return items.map(item => ({
      ...item,
      formattedTime: new Date(item.received_at).toLocaleString(),
      timestamp: parseInt(item.timestamp),
    })).sort((a, b) => a.timestamp - b.timestamp);
  };

  // Filter data based on date range
  const filterDataByDate = (data) => {
    const now = new Date();
    const cutoff = new Date();

    switch (dateRange) {
      case 'day':
        cutoff.setDate(now.getDate() - 1);
        break;
      case 'week':
        cutoff.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(now.getMonth() - 1);
        break;
      default:
        return data; // Return all data
    }

    return data.filter(item => new Date(item.received_at) >= cutoff);
  };

  // Handle initial data load
  useEffect(() => {
    if (data) {
      loadAllData(data).then(allItems => {
        const processedData = processData(allItems);
        setSensorData(processedData);
        
        // Update devices list
        const deviceSet = new Set(allItems.map(item => item.device_id));
        setDevices(deviceSet);
        
        console.log(`Loaded ${processedData.length} total readings`);
      });
    }
  }, [data]);

  // Handle real-time updates
  useEffect(() => {
    if (subData?.onCreateSensorsData) {
      const newData = subData.onCreateSensorsData;
      console.log('New sensor data received:', newData);
      
      setSensorData(prevData => {
        const updatedData = processData([...prevData, newData]);
        return updatedData;
      });

      setDevices(prev => new Set([...prev, newData.device_id]));
    }
  }, [subData]);

  // Filter data based on selected device and date range
  const filteredData = filterDataByDate(
    selectedDevice 
      ? sensorData.filter(item => item.device_id === selectedDevice)
      : sensorData
  );

  if (error) {
    console.error('Query error:', error);
    return <div className="error-message">Error loading sensor data: {error.message}</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Real-time Sensor Dashboard</h1>
        <div className="controls">
          <div className="device-selector">
            <select 
              value={selectedDevice || ''} 
              onChange={(e) => setSelectedDevice(e.target.value || null)}
            >
              <option value="">All Devices</option>
              {[...devices].map(device => (
                <option key={device} value={device}>{device}</option>
              ))}
            </select>
          </div>
          <div className="date-range-selector">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="day">Last 24 Hours</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
            </select>
          </div>
          <div className="data-info">
            Showing {filteredData.length} readings
            {selectedDevice ? ` for ${selectedDevice}` : ''}
          </div>
        </div>
      </div>

      {loading && sensorData.length === 0 ? (
        <div className="loading">Loading sensor data...</div>
      ) : (
        <div className="charts-grid">
          {/* Temperature and Humidity Chart */}
          <div className="chart-container">
            <h2>Temperature and Humidity Trends</h2>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="formattedTime" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  interval="preserveEnd"
                />
                <YAxis 
                  yAxisId="temp" 
                  domain={['auto', 'auto']}
                  label={{ value: '°C', position: 'insideLeft' }}
                />
                <YAxis 
                  yAxisId="humid" 
                  orientation="right" 
                  domain={[0, 100]}
                  label={{ value: '%', position: 'insideRight' }}
                />
                <Tooltip />
                <Legend />
                <Area 
                  yAxisId="temp" 
                  type="monotone" 
                  dataKey="temperature" 
                  stroke="#ff7300" 
                  fill="#ff7300" 
                  fillOpacity={0.3} 
                  name="Temperature (°C)" 
                />
                <Area 
                  yAxisId="humid" 
                  type="monotone" 
                  dataKey="humidity" 
                  stroke="#82ca9d" 
                  fill="#82ca9d" 
                  fillOpacity={0.3} 
                  name="Humidity (%)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Battery and Movement Chart */}
          <div className="chart-container">
            <h2>Battery and Movement</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="formattedTime" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  interval="preserveEnd"
                />
                <YAxis 
                  yAxisId="battery"
                  domain={['auto', 'auto']}
                  label={{ value: 'V', position: 'insideLeft' }}
                />
                <YAxis 
                  yAxisId="moves"
                  orientation="right"
                  domain={['auto', 'auto']}
                  label={{ value: 'Count', position: 'insideRight' }}
                />
                <Tooltip />
                <Legend />
                <Line 
                  yAxisId="battery"
                  type="monotone" 
                  dataKey="battery_voltage" 
                  stroke="#8884d8" 
                  name="Battery (V)" 
                />
                <Line 
                  yAxisId="moves"
                  type="monotone" 
                  dataKey="move_count" 
                  stroke="#ffc658" 
                  name="Movements" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Latest Values Panel */}
          {filteredData.length > 0 && (
            <div className="latest-readings">
              <h2>Latest Reading</h2>
              <div className="reading-card">
                <div className="reading-header">
                  <h3>Device: {filteredData[filteredData.length - 1].device_id}</h3>
                  <span className="timestamp">
                    {new Date(filteredData[filteredData.length - 1].received_at).toLocaleString()}
                  </span>
                </div>
                <div className="readings-data">
                  <div className="reading-item">
                    <label>Temperature</label>
                    <span>{filteredData[filteredData.length - 1].temperature.toFixed(1)}°C</span>
                  </div>
                  <div className="reading-item">
                    <label>Humidity</label>
                    <span>{filteredData[filteredData.length - 1].humidity.toFixed(1)}%</span>
                  </div>
                  <div className="reading-item">
                    <label>Battery</label>
                    <span>{filteredData[filteredData.length - 1].battery_voltage.toFixed(2)}V</span>
                  </div>
                  <div className="reading-item">
                    <label>Move Count</label>
                    <span>{filteredData[filteredData.length - 1].move_count}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 