# 🌍 3D World Map Viewer

A **browser-based 3D visualization of the world map** built with [Three.js](https://threejs.org/).  
It renders a global **heightmap** interactively, streaming and caching tiles dynamically for smooth navigation.  

<p align="center">
  <img src="docs/mapvis.gif" alt="3D World Map Demo" width="700"/>
</p>


## ✨ Features

- **3D heightmap rendering** with realistic terrain
- **GPU clipmap** centered on the camera. Based on [this](https://mikejsavage.co.uk/geometry-clipmaps/) article.
- **CPU quadtree** for adaptive tile scaling & level-of-detail management
- **Tile cache system**
  - One GPU texture for height data
  - One GPU texture for imagery
  - CPU-managed tile priority & streaming
  - LRU cache keeps visible tiles loaded and evicts unused tiles
- Built with **Three.js** → runs directly in the browser


## 🛠️ How It Works

### 🎮 Rendering pipeline
- **Vertices** are generated using a **GPU clipmap** shader, avoiding floating heightmap artifacts.  
- **LOD selection** is handled by a **CPU-side quadtree**, deciding which tile resolution to render at which position.  

### 📦 Tile Management
- **Tile cache** keeps rendering smooth:
  - Height + texture tiles are stored in dedicated GPU textures.
  - A **CPU tile manager** assigns priorities and writes downloaded tiles to the GPU texture.
  - An **LRU strategy** ensures visible tiles remain cached while unused tiles are dropped.


## 📷 Demo

👉 [YouTube Demo](https://www.youtube.com/watch?v=dSGRqYxa79E)  


## 📚 Tech Stack

- [Three.js](https://threejs.org/) – WebGL abstraction & rendering
- **Custom GLSL shaders** – GPU clipmap for vertices, Height Shader
- **TypeScript** – CPU quadtree logic & tile streaming


## 🚀 Getting Started

Clone the repo and install dependencies:

```bash
git clone https://github.com/david-westreicher/mapvis.git
cd mapvis
npm install
npm run start
```
```
