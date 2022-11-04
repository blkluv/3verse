import React, { useEffect, useState } from 'react'
import { LatLngTuple } from 'leaflet'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import what3words from '@what3words/api'
import { What3wordsService } from '@what3words/api/dist/service'
import { drawChosenSquares, drawGrid } from '../../helpers'
import Header from '../Header'
import Camera from '../Camera'

const GREEN = '#1ec716'
const options = {
  enableHighAccuracy: true,
}

function Grid({
  api,
  setMoveEnd,
  setLineOpacity,
}) {
  const map = useMap()

  useEffect(() => {
    map.whenReady(() => drawGrid(map, api))
    map.on('zoomend', function () {
      setMoveEnd(Math.random())
      drawGrid(map, api)
    })

    map.on('dragend', function () {
      setMoveEnd(Math.random())
      drawGrid(map, api)
    })

    map.on('movestart', () => {
      setLineOpacity(0)
    })
  }, [map, api])

  return null
}

function ChosenSquares({
  api,
  chosenSquares,
  isClaiming,
  words,
  setMoveEnd,
  claimed,
  moveEnd,
}) {
  const map = useMap()

  useEffect(() => {
    if (chosenSquares.length) {
      if (!isClaiming && !claimed) {
        drawChosenSquares(map, api, [words], isClaiming, setMoveEnd)
      } else {
        drawChosenSquares(map, api, chosenSquares, isClaiming, setMoveEnd)
      }
    }
  }, [chosenSquares, isClaiming, moveEnd])

  return null
}

function Map() {
  const [hasAccessToLocation, setHasAccessToLocation] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [chosenSquares, setChosenSquares] = useState([])
  const [words, setWords] = useState('')
  const [initialCoords, setInitialCoords] = useState()
  const [moveEnd, setMoveEnd] = useState(0)

  const [lineRight, setLineRight] = useState(0)
  const [lineBottom, setLineBottom] = useState(0)
  const [lineOpacity, setLineOpacity] = useState(1)

  const [popupOpened, setPopupOpened] = useState(false)

  const api = what3words()
  api.setApiKey(process.env.NEXT_PUBLIC_API_KEY)

  useEffect(() => {
    const id = navigator.geolocation.watchPosition(
      (position) => {
        setHasAccessToLocation(true)
        const {
          coords: { latitude: lat, longitude: lng },
        } = position
        if (
          !initialCoords ||
          (initialCoords[0] !== lat && initialCoords[1] !== lng)
        ) {
          setInitialCoords([lat, lng])
          api
            .convertTo3wa({
              coordinates: { lat, lng },
            })
            .then((res) => {
              setWords(res.words)
              if (!chosenSquares.includes(res.words)) {
                setChosenSquares([...chosenSquares, res.words])
              }
            })
            .catch((err) => {
              setHasAccessToLocation(false)
              console.error(err)
            })
        }
      },
      (err) => {
        setHasAccessToLocation(false)
        console.error(err)
      },
      options
    )

    return () => navigator.geolocation.clearWatch(id)
  }, [initialCoords, chosenSquares])

  useEffect(() => {
    if (isClaiming) return
    const el = document.getElementsByClassName(words + GREEN.slice(1))[0]

    // bug here
    if (el) {
      const rect = el.getBoundingClientRect()
      setLineRight(rect.left - 50)
      setLineBottom(rect.bottom - 60)
      setLineOpacity(1)
    }
  }, [moveEnd, chosenSquares, isClaiming])

  const startTracking = () => {
    setIsClaiming(true)
  }

  const finishTracking = () => {
    setIsClaiming(false)
    setClaimed(true)
    setPopupOpened(true)
  }

  if (!hasAccessToLocation || !initialCoords)
    return <div style={{ margin: '2rem' }}>Loading...</div>

  return (
    <div style={{ position: 'relative' }}>
      <MapContainer
        center={initialCoords}
        zoom={19}
        scrollWheelZoom={false}
        maxZoom={21}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxNativeZoom={19}
          maxZoom={21}
          minZoom={18}
        />
        <Grid
          api={api}
          setMoveEnd={setMoveEnd}
          setLineOpacity={setLineOpacity}
        />
        <ChosenSquares
          chosenSquares={chosenSquares}
          api={api}
          isClaiming={isClaiming}
          words={words}
          setMoveEnd={setMoveEnd}
          claimed={claimed}
          moveEnd={moveEnd}
        />
      </MapContainer>
      {!isClaiming && (
        <div
          className="line-text"
          style={{
            top: lineBottom + 15 + 'px',
            left: lineRight + 50 + 'px',
            opacity: lineOpacity,
          }}
        >
          My Location
        </div>
      )}
      <Header words={words} />   
      <div style={{ position: 'absolute', bottom: '1rem', left: '2rem', right: '2rem', fontSize: '13px', padding: '5px', zIndex: 401,}}>
        <div className="relative w-[50%]">
          <div className="block p-4 pl-10 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
            {chosenSquares.join(' ')}
          </div>
          <div>
            {isClaiming ? (
              <button onClick={finishTracking} type="button" className="absolute right-2.5 bottom-2.5 text-white bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-green-300 dark:focus:ring-green-800 font-medium rounded-lg px-6 py-2">Claim Land</button>
            ) : (
              <button onClick={startTracking} type="button" className="absolute right-2.5 bottom-2.5 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg px-6 py-2">Claim Tile</button>
            )}
            {/* <CameraPopup popupOpened={popupOpened} setPopupOpened={setPopupOpened} chosenSquares={chosenSquares} /> */}
            <Camera popupOpened={popupOpened} setPopupOpened={setPopupOpened} chosenSquares={chosenSquares} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Map