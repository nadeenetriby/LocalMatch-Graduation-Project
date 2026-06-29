# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


# LocalMatch - AI-Powered Fashion Search Platform

## Overview

LocalMatch is an AI-powered fashion search platform that helps users find clothing products using either images or natural language descriptions in both Arabic and English.

The system combines computer vision and multimodal AI to understand user queries and retrieve visually similar fashion products from a local database.

---

## Features

- Image-based fashion search
- Text-based fashion search
- Combined image + text search
- Arabic and English query support
- AI-generated image captions using BLIP
- Semantic search using FashionCLIP
- Fast similarity search with FAISS
- Modern React user interface

---

## Technologies Used

### Frontend
- React
- Vite
- CSS
- JavaScript

### Backend
- FastAPI
- Python
- Uvicorn

### AI & Machine Learning
- FashionCLIP
- BLIP
- FAISS
- PyTorch
- Transformers

---

# Project Structure

```
LocalMatch
│
├── src/                # React frontend
├── server/             # FastAPI backend
├── clip_model/         # AI model and embeddings
├── data/               # Fashion dataset
├── public/
└── README.md
```

---

# Prerequisites

Before running the project, install:

- Node.js (v18 or later)
- Python 3.11+
- Git

---

# Installation

# Installation

## Clone the repository

```bash
git clone https://github.com/nadeenetriby/LocalMatch-Graduation-Project.git
cd LocalMatch-Graduation-Project
```

## Frontend Setup

Install the required Node.js packages:

```bash
npm install
```

## Backend Setup

Navigate to the backend folder:

```bash
cd server
```

Create and activate a virtual environment:

**Windows**

```bash
python -m venv venv
venv\Scripts\activate
```

Install the required Python libraries manually:

```bash
pip install fastapi uvicorn torch torchvision transformers faiss-cpu pillow numpy pandas requests python-multipart sentencepiece accelerate
```

---

# Running the Application

## Start the AI Backend

```bash
cd server
uvicorn ai_server:app --reload
```

## Start the Frontend

Open a second terminal:

```bash
npm run dev
```

The application will be available at:

```
http://localhost:5173
```


# AI Models

This project uses:

- FashionCLIP
- BLIP
- FAISS

for semantic fashion search and image understanding.

---

# Search Modes

- Search by Image
- Search by Text
- Combined Image + Text Search

---

# License

This project was developed as a Graduation Project.
