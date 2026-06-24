import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
	apiKey: "AIzaSyB-vr0y-w3jZ7iwynNAYl3w6HHg4ri4Y_w",
	authDomain: "mood-playlist-sync.firebaseapp.com",
	databaseURL: "https://mood-playlist-sync-default-rtdb.asia-southeast1.firebasedatabase.app",
	projectId: "mood-playlist-sync",
	storageBucket: "mood-playlist-sync.firebasestorage.app",
	messagingSenderId: "687904126875",
	appId: "1:687904126875:web:fecb2cee97f0d5ba74933e",
	measurementId: "G-7WGR0ZG7S8"
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
