import { useState, useCallback, useRef, useEffect } from 'react'
import { SyncContext } from './SyncContextDefinition'
import { createRoom as fbCreateRoom, joinRoom as fbJoinRoom, setTrack as fbSetTrack, setPlaylist as fbSetPlaylist, leaveRoom as fbLeaveRoom, registerPresence } from '../api/sync'

export function SyncProvider({ children }) {
	const [roomId, setRoomId] = useState(null)
	const [isHost, setIsHost] = useState(false)
	const [currentTrack, setCurrentTrack] = useState(null)
	const [remoteTracks, setRemoteTracks] = useState([])
	const [remoteMood, setRemoteMood] = useState(null)
	const [listeners, setListeners] = useState(0)
	const unsubRef = useRef(null)
	const unsubPresenceRef = useRef(null)

	useEffect(() => {
		return () => {
			if (unsubRef.current) unsubRef.current()
			if (unsubPresenceRef.current) unsubPresenceRef.current()
		}
	}, [])

	const createNewRoom = useCallback(() => {
		const id = fbCreateRoom()
		setRoomId(id)
		setIsHost(true)

		if (unsubRef.current) unsubRef.current()
		if (unsubPresenceRef.current) unsubPresenceRef.current()

		unsubRef.current = fbJoinRoom(id, (data) => {
			setCurrentTrack(data.currentTrack)
			setRemoteTracks(data.tracks || [])
			setRemoteMood(data.mood)
		}, (count) => setListeners(count))

		unsubPresenceRef.current = registerPresence(id)

		return id
	}, [])

	const joinExistingRoom = useCallback((id) => {
		setRoomId(id)
		setIsHost(false)

		if (unsubRef.current) unsubRef.current()
		if (unsubPresenceRef.current) unsubPresenceRef.current()

		unsubRef.current = fbJoinRoom(id, (data) => {
			setCurrentTrack(data.currentTrack)
			setRemoteTracks(data.tracks || [])
			setRemoteMood(data.mood)
		}, (count) => setListeners(count))

		unsubPresenceRef.current = registerPresence(id)
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
		if (unsubPresenceRef.current) {
			unsubPresenceRef.current()
			unsubPresenceRef.current = null
		}
		if (roomId) fbLeaveRoom(roomId)
		setRoomId(null)
		setIsHost(false)
		setCurrentTrack(null)
		setRemoteTracks([])
		setRemoteMood(null)
		setListeners(0)
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
