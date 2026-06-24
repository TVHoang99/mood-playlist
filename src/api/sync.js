import { ref, set, onValue, off, push } from 'firebase/database'
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
