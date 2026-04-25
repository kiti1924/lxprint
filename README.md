# Thermal Printer Web UI

English | [日本語](./README_JP.md)

A modern, web-based label and photo printing application designed for portable thermal printers. Connect your device via Web Bluetooth and start creating custom labels or printing high-quality processed photos directly from your browser.

### 🌐 Live Demo (Web UI)
**[Open Thermal Printer Web UI](https://thermal-printer-web-ui-1.onrender.com/)**

> [!NOTE]
> - **Testing Only**: This live demo is provided for testing purposes. If there is high traffic, the service may become temporarily unavailable or slow.
> - **Privacy & Data**: This is a client-side application. Your data (labels, photos, settings) is **never saved on the server**. Everything is processed and stored entirely within your local device's browser.

## Features

### 🏷️ Professional Label Maker
Design custom labels with precise control over every detail:
- **Smart Sizing**:
    - **Auto-Shrink**: Automatically reduces font size to ensure long text fits perfectly within the label width.
    - **Auto-Expand**: Maximizes the font size to fill the available space for a bold look.
- **Text Alignment**: Choose between Left, Center, or Right alignment.
- **Font Customization**: Select from various font families and manually adjust font sizes when needed.
- **Length Control**: Set the label length to "Auto" (dynamic based on text) or define a fixed size (e.g., 28mm).
- **Directional Printing**: Support for both Horizontal and Vertical text orientations.

### 🖼️ Advanced Photo Printing
Optimize your images for the best possible print quality on thermal paper:
- **Automatic Scaling**: Images are automatically resized to fit the printer's maximum width (typically 384px).
- **Auto Trim**: Intelligently detects and removes white or transparent margins to save paper and focus on the subject.
- **Image Processing Methods**:
    - **Dithering (Floyd-Steinberg)**: Perfect for photos and complex images, creating smooth gradients using halftone patterns.
    - **Threshold (Black & White)**: Ideal for logos, QR codes, and simple graphics, producing sharp, high-contrast results.

### 📊 Excel Batch Printing
Efficiently print multiple labels at once using data from spreadsheets. Recent updates have introduced advanced layout control, including "Zero-Gap" continuous printing.

- **Advanced Row Processing**:
    - **Loop Support**: Add a "Loop" column to your Excel file to print the same row multiple times.
    - **Segment Splitting**: Use semicolons (`;`) within a cell to generate separate labels for each segment.
- **Formatting and Layout**:
    - **Compact Mode**: Intelligently packs keys and values to optimize space.
    - **Auto Wrap**: Ensures long data entries are correctly wrapped within the print width.
- **Batching & Spacing Control**:
    - **Batch Printing (Multi-row Consolidation)**: Combine multiple rows into a single image before sending to the printer. This eliminates transmission overhead and enables pixel-perfect spacing control. The batch size is configurable (1-100).
    - **Print Spacing (mm)**: Set precise gaps between rows in `0.1mm` increments.
    - **Print Delay**: Set a custom delay between batches to allow the printer to cool or for easier handling.
- **💡 How to Achieve "Zero-Gap" Printing**:
    By combining the following settings, you can print labels continuously with absolutely no gaps:
    1. Check **"Combine multiple rows into a single print job"** (Batch Printing).
    2. Set **"Print Spacing (mm)"** to **0**.
    3. Set **"Length"** to **Auto**.
    4. Set **"Padding (px)"** to **0**.
- **High-Precision Preview**: The scrollable preview list accurately reflects your spacing settings in real-time, matching the actual print output.

### ⚡ Smart Connectivity & UI
- **Web Bluetooth**: Direct connection from your browser to the printer—no drivers or extra software required.
- **Multi-Language Support**: Fully translated into English and Japanese.
- **Responsive Design**: A premium, modern interface optimized for both desktop and mobile browsers.

### ⚙️ Detailed Options
Access the **"Detailed Options"** menu at the bottom of the controls to fine-tune your experience:
- **Prevent Browser Sleep**: Keeps the screen awake during long sessions (requires Wake Lock API support).
- **Prevent Printer Sleep**: Sends keep-alive signals to avoid the printer's auto power-off function.
- **Advanced Font Size**: Unlocks an extended range of font sizes for more granular control.
- **Advanced Fonts**: Enables access to a broader list of system font families.
- **Excel Mode**: Toggles the specialized interface for batch processing spreadsheet data.
- **Text Direction**: Choose between **Horizontal** or **Vertical** printing orientations.

## Getting Started

### Prerequisites
- A compatible thermal printer (e.g., LX-D02 or similar).
- A browser that supports Web Bluetooth (Chrome, Edge, or Opera recommended).
- **Node.js** and **npm** installed for local development.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/lxprint.git
   cd lxprint
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open the displayed local URL in your browser.

### Usage

#### 1. Connection
Click the **"Connect"** button in the header. Select your printer from the Bluetooth pairing dialog (look for names starting with "LX-").

#### 2. Label Maker
- Type your text in the text area. The preview updates in real-time.
- Use **Auto-Shrink** or **Auto-Expand** to fit text perfectly.
- Set a fixed label length or keep it "Auto" for dynamic height.
- Click **"Print Label"** to send to your device.

#### 3. Excel Batch Printing
- Enable **Excel Mode** in Detailed Options.
- Upload your `.xlsx` or `.xls` file.
- Review the labels in the scrollable preview list.
- Click **"Excel Print"** to start the batch. The UI will track progress (e.g., "1/50").

#### 4. Photo Printing
- Switch to the **Photo** tab.
- Select an image file. It will be automatically scaled to the printer's width.
- Toggle **Auto Trim** to remove unnecessary white space.
- Select your preferred processing method (**Dithering** for photos, **Threshold** for logos).
- Click **"Print Photo"**.

## Troubleshooting

**Q: I cannot find or connect to my printer. What should I check first?**
- **Bluetooth Status**: Ensure Bluetooth is enabled on your system.
- **Browser Check**: Visit `chrome://bluetooth-internals/#devices` to see if the browser discovers your device.

**Q: My printer doesn't show up in the pairing dialog on my Mac.**
- macOS discovery can be finicky. Try using the **LightBlue** app (available on the App Store) to verify that your printer (usually "LX-...") is broadcasting.

**Q: The connection was lost and I can't reconnect.**
- Web Bluetooth can sometimes hang. Completely quit your browser (**Command + Q** on Mac) to clear the Bluetooth cache, then try again.

## Credits

This project was built upon the foundations laid by:
- **[paradon/lxprint](https://github.com/paradon/lxprint)**: We are grateful for their original implementation of the core Web Bluetooth protocols and printer communication logic.