import { ref, set, onValue, off, push, onDisconnect, onChildAdded, onChildRemoved, serverTimestamp } from 'firebase/database'
import { db } from '../firebase'

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
	const myRef = push(presenceRef)
	const connectedRef = ref(db, '.info/connected')

	const unsubConnected = onValue(connectedRef, (snap) => {
		if (snap.val() === true) {
			onDisconnect(myRef).remove()
			set(myRef, { joinedAt: serverTimestamp() })
		}
	})

	return () => {
		unsubConnected()
		try { myRef.remove() } catch (e) {}
	}
}

export function joinRoom(roomId, callback, onListenersChange) {
	const roomRef = ref(db, `rooms/${roomId}`)
	const unsubData = onValue(roomRef, (snapshot) => {
		const data = snapshot.val()
		if (data) {
			callback(data)
		}
	})

	const presenceRef = ref(db, `rooms/${roomId}/presence`)
	let count = 0

	const unsubAdded = onChildAdded(presenceRef, () => {
		count++
		if (onListenersChange) onListenersChange(count)
	})

	const unsubRemoved = onChildRemoved(presenceRef, () => {
		count = Math.max(0, count - 1)
		if (onListenersChange) onListenersChange(count)
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
