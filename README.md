# CodeCollab: Collaborative Code Editor with Video Call

This project is a collaborative code editor that allows multiple users to edit code in real-time while also supporting video calls. It utilizes WebSocket for real-time communication and the Monaco Editor for code editing.

## Features

- **Real-time collaboration**: Multiple users can edit the same code simultaneously.
- **Video call integration**: Users can communicate via video while coding.
- **Language support**: Users can select from multiple programming languages.
- **Custom input**: Users can provide custom input for their code execution.

## Getting Started

### Prerequisites

- Node.js installed on your machine.
- Basic understanding of JavaScript and WebSocket.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/meeheer123/CodeCollab.git
   cd CodeCollab
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the WebSocket server:
   ```bash
   node server.js
   ```

4. Open `index.html` in your browser to access the collaborative editor.

## Usage

1. **Connecting to a Room**: 
   - Users can connect to a specific room by appending `?room=roomName` to the URL, or they will be placed in a default room if none is specified.
  
2. **Editing Code**: 
   - Use the Monaco Editor interface to write and edit code. Changes are broadcasted to all clients in the same room.

3. **Running Code**: 
   - Select a programming language and click the "Run Code" button to execute the code using the Piston API.

4. **Video Call Controls**:
   - Toggle audio and video using the provided buttons.

## Code Overview

### Server Code (server.js)

The server is implemented using `Express.JS` and the `ws` library



### Client Code (index.html)

The client-side code includes HTML for layout and JavaScript for functionality:


## Contributing

Feel free to submit issues or pull requests for improvements or bug fixes.

## License

This project is licensed under the MIT License. See LICENSE for details.