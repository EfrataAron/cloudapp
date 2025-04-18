import React from 'react';

const AlertSystem = ({ sensorData }) => {
  // Alert thresholds
  const THRESHOLDS = {
    TEMPERATURE_HIGH: 30,
    TEMPERATURE_LOW: 10,
    HUMIDITY_HIGH: 80,
    HUMIDITY_LOW: 20,
    BATTERY_LOW: 2.5,
    MOVEMENT_HIGH: 100
  };

  // Generate alerts based on latest readings
  const generateAlerts = () => {
    if (!sensorData || sensorData.length === 0) return [];

    const latestReading = sensorData[sensorData.length - 1];
    const alerts = [];

    // Temperature alerts
    if (latestReading.temperature > THRESHOLDS.TEMPERATURE_HIGH) {
      alerts.push({
        severity: 'critical',
        message: `High temperature detected: ${latestReading.temperature}°C`,
        time: new Date(latestReading.received_at).toLocaleString(),
        device: latestReading.device_id
      });
    } else if (latestReading.temperature < THRESHOLDS.TEMPERATURE_LOW) {
      alerts.push({
        severity: 'warning',
        message: `Low temperature detected: ${latestReading.temperature}°C`,
        time: new Date(latestReading.received_at).toLocaleString(),
        device: latestReading.device_id
      });
    }

    // Humidity alerts
    if (latestReading.humidity > THRESHOLDS.HUMIDITY_HIGH) {
      alerts.push({
        severity: 'critical',
        message: `High humidity detected: ${latestReading.humidity}%`,
        time: new Date(latestReading.received_at).toLocaleString(),
        device: latestReading.device_id
      });
    } else if (latestReading.humidity < THRESHOLDS.HUMIDITY_LOW) {
      alerts.push({
        severity: 'warning',
        message: `Low humidity detected: ${latestReading.humidity}%`,
        time: new Date(latestReading.received_at).toLocaleString(),
        device: latestReading.device_id
      });
    }

    // Battery alerts
    if (latestReading.battery_voltage < THRESHOLDS.BATTERY_LOW) {
      alerts.push({
        severity: 'critical',
        message: `Low battery: ${latestReading.battery_voltage}V`,
        time: new Date(latestReading.received_at).toLocaleString(),
        device: latestReading.device_id
      });
    }

    // Movement alerts
    if (latestReading.move_count > THRESHOLDS.MOVEMENT_HIGH) {
      alerts.push({
        severity: 'warning',
        message: `High movement detected: ${latestReading.move_count} movements`,
        time: new Date(latestReading.received_at).toLocaleString(),
        device: latestReading.device_id
      });
    }

    return alerts;
  };

  const alerts = generateAlerts();

  return (
    <div className="alerts-panel">
      <h2>System Alerts</h2>
      <div className="alerts-container">
        {alerts.length === 0 ? (
          <div className="no-alerts">No active alerts</div>
        ) : (
          alerts.map((alert, index) => (
            <div key={index} className={`alert-item ${alert.severity}`}>
              <span className="alert-time">{alert.time}</span>
              <span className="alert-severity">{alert.severity.toUpperCase()}</span>
              <span className="alert-message">{alert.message}</span>
              <span className="alert-device">Device: {alert.device}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertSystem; 