# Jaago AI ⏰🤖

> The snooze button is the enemy of productivity. So, I built an AI that defeats it.

**Jaago AI** is an intelligent alarm clock that doesn't just wake you up; it makes sure you stay up. Instead of a simple swipe to dismiss, Jaago AI requires you to complete AI-verified tasks to turn off the alarm. If you fail or ignore the tasks, the alarm gets louder!

## ✨ Features

*   **AI-Verified Wake-Up Tasks:**
    *   📸 **Selfie Verification:** Take a selfie proving your eyes are wide open.
    *   🎙️ **Read Aloud:** Read a generated motivational quote loud and clear.
    *   🔍 **Scan Object:** Get out of bed and scan a specific object (like a bathroom sink or toothbrush).
    *   🚶 **Step Counter:** Walk a specific number of steps to prove you are out of bed.
    *   🧘 **Chanting:** Chant a specific mantra (e.g., "Radha") a set number of times.
*   **Dynamic Personas:** Adapts to your lifestyle (Student, CEO, Gym Freak, Night Shift Worker) to give you custom morning motivation and quotes.
*   **Custom Ringtones:** Upload your own audio files (songs, voice notes) directly from your device to use as your alarm sound (saved locally via IndexedDB).
*   **Fully Responsive:** Beautiful, dark-mode UI that works seamlessly across mobile, tablets, and desktop devices.
*   **Built-in Tools:** Includes a standard Clock and a fully functional Stopwatch with lap tracking.

## 🛠️ Tech Stack

*   **Frontend:** React 18, Vite, TypeScript
*   **Styling:** Tailwind CSS, Lucide React (Icons)
*   **AI Integration:** Google Gemini API (for image analysis, speech verification, and quote generation)
*   **Browser APIs:** Web Audio API (for alarm sounds), MediaDevices API (Camera/Mic), IndexedDB (for local audio storage)

## 🚀 Getting Started

### Prerequisites
*   Node.js installed on your machine.
*   A Google Gemini API Key.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/suresh-tech01/Jaago-AI.git
    cd jaago-ai
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env` file in the root directory and add your Gemini API key:
    ```env
    VITE_GEMINI_API_KEY=your_api_key_here
    ```
    *(Note: Adjust the variable name based on your specific Vite setup if necessary)*

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  **Open your browser:**
    Navigate to `http://localhost:3000` (or the port provided by Vite).

## 📱 Usage

1.  Open the app and go to the **Alarm** tab.
2.  Set your desired wake-up time and select the days you want it to repeat.
3.  Choose your wake-up tasks (e.g., Photo Face, Read Sentence).
4.  Select a ringtone or upload your custom audio.
5.  Make sure your browser has Camera and Microphone permissions enabled for the tasks to work!

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📝 License
This project is licensed under the MIT License.
