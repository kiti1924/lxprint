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
Efficiently print multiple labels at once using data from spreadsheets:
- **Bulk Upload**: Support for `.xlsx` and `.xls` files to automate label creation.
- **Advanced Row Processing**:
    - **Loop Support**: Add a "Loop" column to your Excel file to print the same row multiple times.
    - **Segment Splitting**: Use semicolons (`;`) within a cell to generate separate labels for each segment.
- **Formatting Options**:
    - **Compact Mode**: Intelligently packs keys and values to optimize space.
    - **Auto Wrap**: Ensures long data entries are correctly wrapped within the 384px width.
- **Precise Batch Control**:
    - **Print Delay**: Set a custom delay (in seconds) between each label to allow the printer to cool or for easier handling.
    - **Paper Spacing**: Configure additional paper feed (in mm) between labels for better separation.
- **Real-time Preview**: View a scrollable list of all generated labels before initiating the print job.

### ⚡ Smart Connectivity & UI
- **Web Bluetooth**: Direct connection from your browser to the printer—no drivers or extra software required.
- **Sleep Prevention**:
    - **Prevent Browser Sleep**: Keeps the screen awake during long sessions.
    - **Prevent Printer Sleep**: Sends keep-alive signals to avoid the printer's auto power-off function.
- **Multi-Language Support**: Fully translated into English and Japanese.
- **Responsive Design**: A premium, modern interface optimized for both desktop and mobile browsers.

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
1. Click the **"Connect"** button in the header.
2. Select your printer from the Bluetooth pairing dialog.
3. Switch between the **Label** and **Photo** tabs to start printing!

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