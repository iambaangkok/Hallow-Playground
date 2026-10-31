import { isPlaygroundCode } from '../shared/protocol'
import { startGame } from './game'
import { showLobby } from './lobby'
import { playgroundExists } from './net'
import { loadProfile } from './profile'

const root = document.getElementById('ui')!
const canvas = document.getElementById('game') as HTMLCanvasElement

const tail = location.pathname.slice(import.meta.env.BASE_URL.length).replace(/\/$/, '').toUpperCase()
const preset = isPlaygroundCode(tail) && (await playgroundExists(tail)) ? tail : null

const { profile, code } = await showLobby(root, loadProfile(), preset)
const target = `${import.meta.env.BASE_URL}${code}`
if (location.pathname !== target) history.replaceState(null, '', target)
startGame(root, canvas, profile, code)
