export default function MapView({ routePolylineEncoded, expectedDurationSec }: { routePolylineEncoded: any, expectedDurationSec: any }) {
  return (
    <div className="h-64 border rounded flex items-center justify-center text-gray-500">
      {routePolylineEncoded ? (
        <div className="text-center">
          <div>Google Map Route (server polyline)</div>
          {expectedDurationSec && <div className="text-sm text-gray-600 mt-2">ETA: {Math.round(expectedDurationSec / 60)} min</div>}
        </div>
      ) : (
        <div>Google Map Route (Server Polyline)</div>
      )}
    </div>
  );
}
