export interface WeatherForecastDay {
  datetime: string;
  condition: string;
  temperature: number;
  templow: number;
  precipitation_probability: number;
}

export interface WeatherEntityAttributes {
  temperature: number;
  temperature_unit: string;
  humidity: number;
  wind_speed: number;
  wind_speed_unit: string;
  pressure: number;
  pressure_unit?: string;
  forecast?: WeatherForecastDay[];
}
