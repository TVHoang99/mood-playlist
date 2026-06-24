import { useState, useCallback, useRef, useEffect } from 'react'
import { SyncContext } from './SyncContextDefinition'
import { createRoom as fbCreateRoom, joinRoom as fbJoinRoom, setTrack as fbSetTrack, setPlaylist as fbSetPlaylist, leaveRoom as fbLeaveRoom } from '../api/sync'

export function SyncProvider({ children }) {
	const [roomId, setRoomId] = useState(null)
	const [isHost, setIsHost] = useState(false)
	const [currentTrack, setCurrentTrack] = useState(null)
	const [remoteTracks, setRemoteTracks] = useState([])
	const [remoteMood, setRemoteMood] = useState(null)
	const [listeners, setListeners] = useState(0)
	const unsubRef = useRef(null)

	useEffect(() => {
		return () => {
			if (unsubRef.current) unsubRef.current()
		}
	}, [])

	const createNewRoom = useCallback(() => {
		const id = fbCreateRoom()
		setRoomId(id)
		setIsHost(true)

		if (unsubRef.current) unsubRef.current()
		unsubRef.current = fbJoinRoom(id, (data) => {
			setCurrentTrack(data.currentTrack)
			setRemoteTracks(data.tracks || [])
			setRemoteMood(data.mood)
			setListeners(data.listeners || 0)
		})

		return id
	}, [])

	const joinExistingRoom = useCallback((id) => {
		setRoomId(id)
		setIsHost(false)

		if (unsubRef.current) unsubRef.current()
		unsubRef.current = fbJoinRoom(id, (data) => {
			setCurrentTrack(data.currentTrack)
			setRemoteTracks(data.tracks || [])
			setRemoteMood(data.mood)
			setListeners(data.listeners || 0)
		})
	}, [])

	const playTrack = useCallback((track) => {
		if (!roomId) return
		setCurrentTrack(track)
		fbSetTrack(roomId, track)
	}, [roomId])

	const syncPlaylist = useCallback((mood, tracks) => {
		if (!roomId) return
		setRemoteTracks(tracks)
		setRemoteMood(mood)
		fbSetPlaylist(roomId, mood, tracks)
	}, [roomId])

	const leaveCurrentRoom = useCallback(() => {
		if (unsubRef.current) {
			unsubRef.current()
			unsubRef.current = null
		}
		if (roomId) fbLeaveRoom(roomId)
		setRoomId(null)
		setIsHost(false)
		setCurrentTrack(null)
		setRemoteTracks([])
		setRemoteMood(null)
	}, [roomId])

	return (
		<SyncContext.Provider value={{
			roomId,
			isHost,
			currentTrack,
			remoteTracks,
			remoteMood,
			listeners,
			createNewRoom,
			joinExistingRoom,
			playTrack,
			syncPlaylist,
			leaveCurrentRoom
		}}>
			{children}
		</SyncContext.Provider>
	)
}
