# Playground

A shared, real-time map that a small group of people walk around together, visiting places, talking to NPCs, and playing silly minigames.

## Language

**Map**:
The single hand-drawn top-down layout that Players walk around in. Every Playground uses the same Map.
_Avoid_: world, level, scene

**Playground**:
One live, shared copy of the Map with its own set of Players. Players in different Playgrounds never see each other.
_Avoid_: room, session, server, instance

**Lobby**:
The screen before the Playground where a Player picks Character and Name, then creates a Playground or joins one by Playground code or from the Public Playground list.
_Avoid_: menu, start screen, home

**Playground code**:
The short code that identifies a Playground and lets a Player join it directly.
_Avoid_: room code, invite link, playground ID

**Public Playground** / **Private Playground**:
A Public Playground is listed for strangers to join. A Private Playground is joinable only with its Playground code.
_Avoid_: open/closed, unlisted

**Player**:
A real person present in a Playground, shown as their chosen Character with their chosen Name.
_Avoid_: user, account

**Character**:
One hand-drawn figure from the Roster. A Player appears as a Character; NPCs are Characters too.
_Avoid_: avatar, sprite, skin

**Roster**:
The fixed set of hand-drawn Characters a Player picks from.
_Avoid_: character list, skins

**Name**:
The display name a Player types when joining. There is no login yet; a browser remembers its Player's Name and Character between visits.
_Avoid_: username, handle

**Bob**:
How every Character moves: the whole drawing bounces as one piece and flips to face left or right. Standing still, it Bobs slowly and slightly. There is no limb animation.
_Avoid_: walk cycle, bubble

**Tap-to-walk**:
The only movement input: tapping or clicking a spot sends the Player's Character there.
_Avoid_: click-to-move, pathing

**NPC**:
A Character not controlled by any Player that a Player can talk to.
_Avoid_: bot, villager

**Link NPC**:
An NPC whose conversation ends by offering a link out of the game, such as the owner's Twitter or personal website.
_Avoid_: link button, signpost

**Say**:
A short text line a Player sends. It shows as a speech bubble above their Character and is added to the Chat log.
_Avoid_: message, post

**Chat log**:
The record of recent Says in the Playground, drawn semi-transparent in the top-left corner. It fades on its own and can be collapsed.
_Avoid_: chat window, history

**Pumpkin Base**:
One of the uncarved pumpkin drawings that ship with the game. A Player picks one before carving; Players never upload their own.
_Avoid_: template, skin

**Cut**:
One closed, straight-edged hole carved into a Pumpkin with the pen tool.
_Avoid_: stroke, line

**Carving**:
A Pumpkin Base plus its Cuts, as it comes out of the carver. A Player holds their Carving, visible to everyone, until they place it.
_Avoid_: draft, held pumpkin

**Pumpkin**:
A Carving placed on the Map, just in front of the Player who held it. It stays in its Playground forever.
_Avoid_: jack-o'-lantern, decoration
