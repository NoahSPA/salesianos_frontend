import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

export type MapPoint = { lat: number; lng: number }

export function MapboxPointPicker(props: {
  token?: string
  value: MapPoint | null
  onChange: (p: MapPoint) => void
  heightClassName?: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)

  useEffect(() => {
    if (!props.token) return
    if (!containerRef.current) return
    if (mapRef.current) return

    mapboxgl.accessToken = props.token

    const initial = props.value ?? { lat: -33.45, lng: -70.66 } // Santiago como default
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [initial.lng, initial.lat],
      zoom: props.value ? 13 : 10,
    })
    mapRef.current = map

    const marker = new mapboxgl.Marker({ color: '#10b981' })
    markerRef.current = marker
    if (props.value) marker.setLngLat([props.value.lng, props.value.lat]).addTo(map)

    map.on('click', (e) => {
      const p = { lat: e.lngLat.lat, lng: e.lngLat.lng }
      marker.setLngLat([p.lng, p.lat]).addTo(map)
      props.onChange(p)
    })

    return () => {
      try {
        marker.remove()
      } catch {
        // ignore
      }
      try {
        map.remove()
      } catch {
        // ignore
      }
      markerRef.current = null
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.token])

  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker) return
    if (!props.value) return
    marker.setLngLat([props.value.lng, props.value.lat]).addTo(map)
    map.easeTo({ center: [props.value.lng, props.value.lat], zoom: 13 })
  }, [props.value])

  if (!props.token) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        Falta configurar <span className="font-medium">VITE_MAPBOX_TOKEN</span> en tu `frontend/.env` local.
      </div>
    )
  }

  return <div ref={containerRef} className={'w-full overflow-hidden rounded-lg border border-slate-200 ' + (props.heightClassName ?? 'h-64')} />
}

