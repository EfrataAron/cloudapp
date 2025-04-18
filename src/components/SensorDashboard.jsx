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
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { gql } from '@apollo/client';
import AlertSystem from './AlertSystem';

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

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function SensorDashboard() {
  const [sensorData, setSensorData] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [devices, setDevices] = useState(new Set());
  const [dateRange, setDateRange] = useState('all'); // 'all', 'day', 'week', 'month'
  const [analytics, setAnalytics] = useState({
    averageTemp: 0,
    averageHumidity: 0,
    totalMovements: 0,
    deviceStats: [],
    temperatureRanges: [],
    humidityRanges: [],
  });

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

  // Calculate analytics from sensor data
  const calculateAnalytics = (data) => {
    const deviceMap = new Map();
    let totalTemp = 0;
    let totalHumidity = 0;
    let totalMovements = 0;
    const tempRangeMap = new Map();    // renamed from tempRanges
    const humidityRangeMap = new Map(); // renamed from humidityRanges

    data.forEach(reading => {
      // Device-specific stats
      if (!deviceMap.has(reading.device_id)) {
        deviceMap.set(reading.device_id, {
          device_id: reading.device_id,
          readingCount: 0,
          avgTemp: 0,
          avgHumidity: 0,
          totalMoves: 0
        });
      }
      const deviceStats = deviceMap.get(reading.device_id);
      deviceStats.readingCount++;
      deviceStats.avgTemp = (deviceStats.avgTemp * (deviceStats.readingCount - 1) + reading.temperature) / deviceStats.readingCount;
      deviceStats.avgHumidity = (deviceStats.avgHumidity * (deviceStats.readingCount - 1) + reading.humidity) / deviceStats.readingCount;
      deviceStats.totalMoves += reading.move_count;

      // Overall stats
      totalTemp += reading.temperature;
      totalHumidity += reading.humidity;
      totalMovements += reading.move_count;

      // Temperature ranges
      const tempRange = Math.floor(reading.temperature / 5) * 5;
      tempRangeMap.set(tempRange, (tempRangeMap.get(tempRange) || 0) + 1);

      // Humidity ranges
      const humidityRange = Math.floor(reading.humidity / 10) * 10;
      humidityRangeMap.set(humidityRange, (humidityRangeMap.get(humidityRange) || 0) + 1);
    });

    // Format temperature ranges for pie chart
    const temperatureRanges = Array.from(tempRangeMap.entries()).map(([range, count]) => ({
      name: `${range}-${range + 5}°C`,
      value: count
    }));

    // Format humidity ranges for pie chart
    const humidityDistribution = Array.from(humidityRangeMap.entries()).map(([range, count]) => ({
      name: `${range}-${range + 10}%`,
      value: count
    }));

    setAnalytics({
      averageTemp: totalTemp / data.length,
      averageHumidity: totalHumidity / data.length,
      totalMovements,
      deviceStats: Array.from(deviceMap.values()),
      temperatureRanges,
      humidityRanges: humidityDistribution
    });
  };

  // Handle initial data load
  useEffect(() => {
    if (data) {
      loadAllData(data).then(allItems => {
        const processedData = processData(allItems);
        setSensorData(processedData);
        calculateAnalytics(processedData);
        
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

      {/* Add AlertSystem here */}
      <AlertSystem sensorData={filteredData} />

      {loading && sensorData.length === 0 ? (
        <div className="loading">Loading sensor data...</div>
      ) : (
        <div className="dashboard-grid">
          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card">
              <h3>Average Temperature</h3>
              <div className="value">{analytics.averageTemp.toFixed(1)}°C</div>
            </div>
            <div className="summary-card">
              <h3>Average Humidity</h3>
              <div className="value">{analytics.averageHumidity.toFixed(1)}%</div>
            </div>
            <div className="summary-card">
              <h3>Total Movements</h3>
              <div className="value">{analytics.totalMovements.toLocaleString()}</div>
            </div>
          </div>

          {/* Temperature and Humidity Area Chart */}
          <div className="chart-container full-width">
            <h2>Temperature and Humidity Trends</h2>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="formattedTime" angle={-45} textAnchor="end" height={80} />
                <YAxis yAxisId="temp" domain={['auto', 'auto']} />
                <YAxis yAxisId="humid" orientation="right" domain={[0, 100]} />
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

          {/* Temperature Distribution Pie Chart */}
          <div className="chart-container">
            <h2>Temperature Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.temperatureRanges}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {analytics.temperatureRanges.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Humidity Distribution Pie Chart */}
          <div className="chart-container">
            <h2>Humidity Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.humidityRanges}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {analytics.humidityRanges.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Device Statistics Bar Chart */}
          <div className="chart-container full-width">
            <h2>Device Statistics</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={analytics.deviceStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="device_id" />
                <YAxis yAxisId="temp" />
                <YAxis yAxisId="moves" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="temp" dataKey="avgTemp" name="Avg Temperature" fill="#8884d8" />
                <Bar yAxisId="temp" dataKey="avgHumidity" name="Avg Humidity" fill="#82ca9d" />
                <Bar yAxisId="moves" dataKey="totalMoves" name="Total Movements" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Battery Status Radial Chart */}
          <div className="chart-container">
            <h2>Battery Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <RadialBarChart 
                innerRadius="10%" 
                outerRadius="80%" 
                data={filteredData.slice(-1)}
                startAngle={180} 
                endAngle={0}
              >
                <RadialBar
                  minAngle={15}
                  label={{ fill: '#666', position: 'insideStart' }}
                  background
                  clockWise={true}
                  dataKey="battery_voltage"
                  name="Battery Voltage"
                />
                <Legend />
                <Tooltip />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
} 