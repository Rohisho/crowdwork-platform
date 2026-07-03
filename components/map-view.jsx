'use client';
import mapboxgl from 'mapbox-gl';
import { useEffect, useRef } from 'react';
import { CATEGORY_MAP } from '@/lib/categories';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function MapView({ center, jobs, onSelect }) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    mapRef.current = new mapboxgl.Map({
      container: container.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom: 12,
      attributionControl: false,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserHeading: true }), 'top-right');
    return () => { mapRef.current?.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.easeTo({ center, duration: 700 });
  }, [center]);

  useEffect(() => {
    if (!mapRef.current) return;
    // clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    jobs.forEach((job) => {
      const cat = CATEGORY_MAP[job.category] || CATEGORY_MAP.other;
      const el = document.createElement('div');
      el.className = 'sj-marker';
      el.style.backgroundColor = cat.color;
      el.textContent = cat.emoji;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([job.lng, job.lat])
        .addTo(mapRef.current);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelect?.(job);
      });
      markersRef.current.push(marker);
    });
  }, [jobs, onSelect]);

  return <div ref={container} className="absolute inset-0" />;
}
