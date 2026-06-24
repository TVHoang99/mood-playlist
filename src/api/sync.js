import { ref, set, onValue, off, push } from 'firebase/database'
import { db } from '../firebase'

export function createRoom() {
	const roomRef = push(ref(db, 'rooms'))
	const roomId = roomRef.key
	set(roomRef, {
		currentTrack: null,
		isPlaying: false,
		createdAt: Date.now()
	})
	return roomId
}

export function joinRoom(roomId, callback) {
	const roomRef = ref(db, `rooms/${roomId}`)
	onValue(roomRef, (snapshot) => {
		const data = snapshot.val()
		if (data) {
			callback(data)
		}
	})
	return () => off(roomRef)
}

export function updateRoom(roomId, data) {
	const roomRef = ref(db, `rooms/${roomId}`)
	set(roomRef, data)
}

export function setTrack(roomId, track) {
	const roomRef = ref(db, `rooms/${roomId}/currentTrack`)
	set(roomRef, track)
}

export function setPlaying(roomId, isPlaying) {
	const roomRef = ref(db, `rooms/${roomId}/isPlaying`)
	set(roomRef, isPlaying)
}

export function leaveRoom(roomId) {
	const roomRef = ref(db, `rooms/${roomId}`)
	off(roomRef)
}
