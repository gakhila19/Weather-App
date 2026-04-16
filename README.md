# Weather Intelligence

A modern, feature-rich weather forecasting application with real-time weather data, dynamic visual effects, and an intuitive user interface.

## Features

### Core Functionality
- **Real-time Weather Search**: Search for weather in any city worldwide using the OpenWeatherMap API
- **Geolocation Support**: Automatically fetch weather for your current location
- **Temperature Unit Toggle**: Switch between Celsius and Fahrenheit with a single click
- **5-Day Forecast**: View detailed weather predictions for the next 5 days
- **Hourly Breakdown**: Check hourly weather patterns for the next 8 hours

### Advanced Features
- **Dynamic Weather Backgrounds**: Background and visual effects change based on weather conditions (rain, snow, thunderstorm, etc.)
- **Extreme Temperature Alerts**: Automatic alerts for dangerous temperatures (heat waves, freezing conditions)
- **Weather-Specific Alerts**: Notifications for thunderstorms and other severe conditions
- **Recent Search History**: Automatically tracks recently searched cities with timestamps
- **Keyboard Navigation**: Full keyboard support for power users (Arrow keys, Enter, Escape)
- **Comprehensive Error Handling**: User-friendly error messages for various failure scenarios
- **Network Status Detection**: Alerts when offline/online status changes

### Environmental Metrics
- Humidity levels with visual indicator
- Wind speed measurement
- Visibility distance
- Atmospheric pressure
- Cloud coverage percentage
- UV index estimation
- Sunrise/sunset tracking with day progress indicator
- Local timezone awareness

## Project Structure

```
Weather App/
├── index.html           # Main HTML structure with built-in styling
├── src/
│   ├── app.js          # Core JavaScript application logic
│   ├── input.css       # Tailwind CSS import and custom utilities
│   └── output.css      # Compiled Tailwind CSS (generated)
├── package.json        # Project metadata and dependencies
├── tailwind.config.js  # Tailwind CSS configuration
└── README.md           # This file
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher) and npm installed on your system
- A free OpenWeatherMap API key ([Get one here](https://openweathermap.org/api))
- A modern web browser with JavaScript enabled

### Installation Steps

1. **Clone or download the project**
   ```bash
   cd "Weather App"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   This installs Tailwind CSS for styling.

3. **Configure your API key**
   - Open `src/app.js` in your editor
   - Find the line: `const API_KEY = "aea3f826788513ec5eaa86686454d9f5";`
   - Replace with your OpenWeatherMap API key:
     ```javascript
     const API_KEY = "your_actual_api_key_here";
     ```

4. **Build Tailwind CSS**
   ```bash
   npm run build
   ```
   This compiles `src/input.css` into `src/output.css`.

5. **Open the application**
   - Open `index.html` in your web browser
   - Or run a local server:
     ```bash
     npx http-server
     ```
     Then navigate to `http://localhost:8080`

## Usage Guide

### Searching for Weather

**By City Name:**
1. Type a city name in the search box (minimum 2 characters)
2. Press Enter or click the Search button
3. Weather data will load instantly

**By Current Location:**
1. Click the "📍 Locate" button
2. Accept the browser's location permission prompt
3. Your local weather will display automatically

**From Recent Searches:**
1. Click the search box to focus it
2. Use Arrow keys (↑/↓) to navigate recent searches
3. Press Enter to select a city
4. Or click directly on a recent city item

### Temperature Unit Toggle
- Click **°C** to display temperatures in Celsius
- Click **°F** to display temperatures in Fahrenheit
- The toggle only affects the main temperature display; forecast data adjusts accordingly

### Interpreting the Display

**Main Weather Card:**
- Current temperature and "feels like" temperature
- Weather condition description
- High/Low temperature for the day
- Location coordinates and country code

**Environmental Metrics:**
- **Humidity**: Moisture level in the air (%)
- **Wind Speed**: Air movement velocity (m/s)
- **Visibility**: How far you can see (km)
- **Pressure**: Atmospheric pressure (hPa)
- **Cloudiness**: Percentage of sky covered by clouds (%)
- **UV Index**: Ultraviolet radiation level (0-11+)

**Sun Tracker:**
- Visual representation of day progress
- Sunrise and sunset times (in local timezone)
- Current position of sun between sunrise and sunset

**Hourly Forecast:**
- Next 8 hours of weather
- Temperature and conditions
- Precipitation probability for each hour

**5-Day Forecast:**
- Condensed daily forecast cards
- High/Low temperatures
- Weather condition icons
- Precipitation probability

### Alert Notifications

The app shows three types of notifications:

1. **Extreme Temperature Alerts** (appear as banner):
   - Heat Warning (35-40°C): "Stay hydrated and limit outdoor activity"
   - Extreme Heat (≥45°C): "Stay indoors, drink water, avoid sun exposure"
   - Freezing (0°C and below): Watch for ice and frost
   - Extreme Cold (≤-10°C): Dress warmly and avoid prolonged exposure
   - Thunderstorm: "Stay indoors and avoid open areas"

2. **Toast Notifications** (temporary popups):
   - Success messages (green)
   - Error messages (red)
   - Warning messages (yellow)
   - Info messages (blue)

3. **Error Modals** (when user action required):
   - City not found
   - Invalid API key
   - Network connection issues
   - Server errors

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Enter** | Search for city or select from dropdown |
| **Arrow Up** | Navigate up in recent searches |
| **Arrow Down** | Navigate down in recent searches |
| **Escape** | Close dropdown menu |
| **Tab** | Navigate between UI elements |

### Recent Search Management

- Recent searches are automatically saved to your browser's session storage
- Maximum of 7 cities stored
- Each entry shows when it was last searched ("5m ago", "2h ago", etc.)
- Click the ✕ on any item to remove it from history
- Click "Clear All" to remove entire history
- History persists during your session but clears when you close the browser tab

## Technical Details

### Technology Stack
- **HTML5**: Semantic markup
- **CSS3**: Custom properties, flexbox, animations, backdrop filters
- **JavaScript (Vanilla)**: No frameworks, ~1000 lines of modular code
- **Tailwind CSS**: Utility-first styling framework
- **OpenWeatherMap API**: Real-time weather data

### API Integration
- **Endpoint**: OpenWeatherMap Free Tier
- **Rate Limit**: 60 requests per minute
- **Data**: Current weather + 5-day forecast
- **Units**: Metric (°C, m/s, km visibility)

### Data Storage
- **Session Storage**: Recent search history (lost when tab closes)
- **No Persistent Storage**: All data is temporary
- **Privacy**: No data sent to external servers except API calls

### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile, Firefox Mobile)

### Performance Optimizations
- Efficient DOM manipulation with cached selectors
- Debounced input filtering for dropdowns
- Single stylesheet (Tailwind compiled once)
- Lazy-loaded weather effects (only when visible)
- Minimal reflows during animation

## Error Handling

The app implements comprehensive error handling for:

| Error | Cause | Resolution |
|-------|-------|-----------|
| **City Not Found** | Invalid city name | Check spelling or try a nearby major city |
| **Invalid API Key** | Missing or incorrect key | Update API_KEY in app.js |
| **Rate Limited** | Too many requests | Wait 1 minute, then retry |
| **No Internet** | Network unavailable | Check connection and retry |
| **Geolocation Denied** | Permission not granted | Enable location in browser settings |
| **Server Error** | API service unavailable | Try again in a few moments |
| **Empty Response** | API returned no data | Retry your request |

All errors display with actionable hints and retry buttons where applicable.

## Development & Customization

### Building CSS
Watch for CSS changes during development:
```bash
npm run watch
```

### Adding Custom Weather Conditions
Edit the `applyWeatherTheme()` function in `app.js` to add more weather backgrounds and effects.

### Extending Functionality
- Add local storage for persistent history
- Integrate additional weather APIs for comparison
- Add weather alerts for specific conditions
- Implement dark/light theme toggle
- Add weather maps overlay
- Create mobile app wrapper

### Code Structure
- **Event Listeners**: Lines 1-80
- **Recent Cities Module**: Lines 82-200
- **API Fetch Functions**: Lines 250-350
- **Rendering Functions**: Lines 400-600
- **Weather Effects**: Lines 650-800
- **Validation & Error Handling**: Lines 850-1000
- **UI State Helpers**: Lines 1050-1100

## Troubleshooting

**Weather data won't load:**
- Verify your API key is correct and has no spaces
- Check your internet connection
- Try a different city name
- OpenWeatherMap may be rate-limited; wait a minute

**Geolocation not working:**
- Grant permission when prompted
- Try searching by city name instead
- Check browser's location services are enabled
- Some networks block geolocation; try a different network

**Styling looks broken:**
- Run `npm run build` to recompile CSS
- Clear your browser cache (Ctrl+Shift+Delete)
- Make sure Tailwind CSS compiled successfully

**Dropdown not appearing:**
- Ensure you have searched for cities previously
- Try clicking the search box
- Check browser console for JavaScript errors

## Browser Console Debugging

Open your browser's Developer Tools (F12) to:
- Check for JavaScript errors
- Monitor API requests in Network tab
- View session storage contents
- Debug weather effect generation

## License

ISC

## Credits

- Weather data provided by [OpenWeatherMap](https://openweathermap.org)
- Icons from [OpenWeatherMap](https://openweathermap.org)
- Fonts: Bebas Neue, DM Sans, DM Mono from Google Fonts
- Designed and developed as a weather intelligence application

## Support

For issues or suggestions:
1. Check the error message for hints
2. Review this README for solutions
3. Verify your API key configuration
4. Check internet connectivity
5. Clear browser cache and restart

---

**Last Updated**: April 2026  
**Version**: 1.0.0
