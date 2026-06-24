import { useState, useCallback, useRef, useEffect } from 'react'
import { SyncContext } from './SyncContextDefinition'
import { createRoom as fbCreateRoom, joinRoom as fbJoinRoom, setTrack as fbSetTrack, leaveRoom as fbLeaveRoom } from '../api/sync'

export function SyncProvider({ children }) {
	const [roomId, setRoomId] = useState(null)
	const [currentTrack, setCurrentTrack] = useState(null)
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

		if (unsubRef.current) unsubRef.current()
		unsubRef.current = fbJoinRoom(id, (data) => {
			setCurrentTrack(data.currentTrack)
			setListeners(data.listeners || 0)
		})

		return id
	}, [])

	const joinExistingRoom = useCallback((id) => {
		setRoomId(id)

		if (unsubRef.current) unsubRef.current()
		unsubRef.current = fbJoinRoom(id, (data) => {
			setCurrentTrack(data.currentTrack)
			setListeners(data.listeners || 0)
		})
	}, [])

	const playTrack = useCallback((track) => {
		if (!roomId) return
		setCurrentTrack(track)
		fbSetTrack(roomId, track)
	}, [roomId])

	const leaveCurrentRoom = useCallback(() => {
		if (unsubRef.current) {
			unsubRef.current()
			unsubRef.current = null
		}
		if (roomId) fbLeaveRoom(roomId)
		setRoomId(null)
		setCurrentTrack(null)
	}, [roomId])

	return (
		<SyncContext.Provider value={{
			roomId,
			currentTrack,
			listeners,
			createNewRoom,
			joinExistingRoom,
			playTrack,
			leaveCurrentRoom
		}}>
			{children}
		</SyncContext.Provider>
	)
}
