"use client";

import Map, { Marker, NavigationControl, Popup, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useState, useEffect } from "react";
import { MapPin, Navigation, User } from "lucide-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

interface Pharmacy {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
}

export default function PharmacyMap({ pharmacies, onSelect }: { pharmacies: Pharmacy[], onSelect: (p: Pharmacy) => void }) {
  const [viewState, setViewState] = useState({
    latitude: 27.7172, // Default to Kathmandu
    longitude: 85.3240,
    zoom: 13
  });

  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [routeData, setRouteData] = useState<any>(null);

  // Use browser geolocation to set initial view
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setViewState((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
      });
    }
  }, []);

  useEffect(() => {
    if (selectedPharmacy && userLocation && MAPBOX_TOKEN) {
      const getRoute = async () => {
        try {
          const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation.lng},${userLocation.lat};${selectedPharmacy.longitude},${selectedPharmacy.latitude}?geometries=geojson&access_token=${MAPBOX_TOKEN}`);
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            setRouteData({
              type: 'Feature',
              properties: {},
              geometry: data.routes[0].geometry
            });
          }
        } catch(error) {
          console.error("Error fetching route:", error);
        }
      };
      getRoute();
    } else {
      setRouteData(null);
    }
  }, [selectedPharmacy, userLocation]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="h-full w-full bg-neutral-900 rounded-3xl flex items-center justify-center p-8 text-center">
        <div>
          <MapPin size={48} className="mx-auto mb-4 text-neutral-600" />
          <h4 className="text-xl font-bold mb-2">Mapbox Token Missing</h4>
          <p className="text-neutral-500 max-w-xs">Please add your Mapbox Access Token to the .env file to see the map.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-3xl overflow-hidden premium-shadow border border-white/10">
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        <NavigationControl position="top-right" />
        
        {pharmacies.map((pharmacy) => (
          <Marker
            key={pharmacy.id}
            latitude={pharmacy.latitude}
            longitude={pharmacy.longitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedPharmacy(pharmacy);
              onSelect(pharmacy);
            }}
          >
            <div className="group cursor-pointer">
               <div className="bg-blue-600 p-2 rounded-full text-white group-hover:bg-blue-500 transition-colors shadow-lg">
                  <Navigation size={16} />
               </div>
            </div>
          </Marker>
        ))}

        {selectedPharmacy && (
          <Popup
            latitude={selectedPharmacy.latitude}
            longitude={selectedPharmacy.longitude}
            anchor="top"
            onClose={() => setSelectedPharmacy(null)}
            closeButton={false}
            className="rounded-xl overflow-hidden"
          >
            <div className="p-2 text-black min-w-[150px]">
              <h5 className="font-bold text-sm">{selectedPharmacy.name}</h5>
              <p className="text-xs text-neutral-600">{selectedPharmacy.address}</p>
            </div>
          </Popup>
        )}

        {userLocation && (
          <Marker latitude={userLocation.lat} longitude={userLocation.lng} anchor="center">
            <div className="w-5 h-5 bg-emerald-500 rounded-full border-2 border-white shadow-[0_0_15px_rgba(16,185,129,0.6)] flex items-center justify-center">
               <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
          </Marker>
        )}

        {routeData && (
          <Source id="routeSource" type="geojson" data={routeData}>
            <Layer
              id="routeLayer"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{ "line-color": "#10b981", "line-width": 4, "line-opacity": 0.8 }}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}
