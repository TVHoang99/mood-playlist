import { ref, set, onValue, off, push, onDisconnect, onChildAdded, onChildRemoved, serverTimestamp } from 'firebase/database'
import { db } from '../firebase'

function generateUserId() {
	return `user_${Math.random().toString(36).slice(2, 8)}`
}

export function createRoom() {
	const roomRef = push(ref(db, 'rooms'))
	const roomId = roomRef.key
	set(roomRef, {
		currentTrack: null,
		mood: null,
		tracks: [],
		isPlaying: false,
		createdAt: Date.now()
	})
	return roomId
}

export function registerPresence(roomId) {
	const presenceRef = ref(db, `rooms/${roomId}/presence`)
	const userId = generateUserId()
	const myRef = push(presenceRef)
	const connectedRef = ref(db, '.info/connected')

	const unsubConnected = onValue(connectedRef, (snap) => {
		if (snap.val() === true) {
			onDisconnect(myRef).remove()
			set(myRef, { userId, joinedAt: serverTimestamp() })
		}
	})

	return () => {
		unsubConnected()
		set(myRef, null)
	}
}

export function joinRoom(roomId, callback, onListenersChange, onListenersUpdate) {
	const roomRef = ref(db, `rooms/${roomId}`)
	const unsubData = onValue(roomRef, (snapshot) => {
		const data = snapshot.val()
		if (data) {
			callback(data)
		}
	})

	const presenceRef = ref(db, `rooms/${roomId}/presence`)
	let count = 0
	let listenerIds = []

	const unsubAdded = onChildAdded(presenceRef, (snap) => {
		count++
		const data = snap.val()
		if (data?.userId) {
			listenerIds = [...listenerIds, data.userId]
		}
		if (onListenersChange) onListenersChange(count)
		if (onListenersUpdate) onListenersUpdate(listenerIds)
	})

	const unsubRemoved = onChildRemoved(presenceRef, (snap) => {
		count = Math.max(0, count - 1)
		const data = snap.val()
		if (data?.userId) {
			listenerIds = listenerIds.filter((id) => id !== data.userId)
		}
		if (onListenersChange) onListenersChange(count)
		if (onListenersUpdate) onListenersUpdate(listenerIds)
	})

	return () => {
		unsubData()
		unsubAdded()
		unsubRemoved()
	}
}

export function setRoomData(roomId, data) {
	const roomRef = ref(db, `rooms/${roomId}`)
	set(roomRef, data)
}

export function setTrack(roomId, track) {
	const roomRef = ref(db, `rooms/${roomId}/currentTrack`)
	set(roomRef, track)
}

export function setPlaylist(roomId, mood, tracks) {
	const updates = {
		mood: mood,
		tracks: tracks
	}
	const roomRef = ref(db, `rooms/${roomId}`)
	set(roomRef, updates)
}

export function leaveRoom(roomId) {
	const roomRef = ref(db, `rooms/${roomId}`)
	off(roomRef)
}
