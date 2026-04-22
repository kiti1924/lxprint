# lxprint (Thermal Printer App)

This repository is a fork of [paradon/lxprint](https://github.com/paradon/lxprint), a Web Bluetooth application designed for affordable thermal printers like the LX-D02.

## Key Updates (Improvements)

This fork introduces several enhancements and new features over the original repository:

### Enhanced Label Maker
- **Text Alignment**: Choose between Left, Center, and Right alignment for your labels.
- **Font Customization**: Easily change font families and adjust font sizes.
- **Length Control**: Set the label length to "Auto" or a fixed size (e.g., 28mm).

### Advanced Photo Printing
- **Auto Trim**: Automatically detects and removes unnecessary white or transparent margins from images before printing.
- **Image Processing Methods**:
  - **Dithering (Floyd-Steinberg)**: Best for photos, providing smooth gradients using halftone patterns.
  - **Threshold (Black & White)**: Best for logos or simple graphics, converting images into sharp black and white.
- **Automatic Scaling**: Images are automatically resized to fit the printer's maximum width (384px).

### Modern UI/UX
- A completely redesigned interface featuring a premium aesthetic for a more intuitive and enjoyable user experience.

## Getting Started (Usage)

### Prerequisites
Before you begin, ensure you have **Node.js** and **npm** (included with Node.js) installed on your machine. You can download them from [nodejs.org](https://nodejs.org/).

### Installation
1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Start the development server:
    ```bash
    npm run dev
    ```
3.  Open the URL shown in your terminal and click "Connect Printer" to pair with your LX device.

## Troubleshooting (Q&A)

**Q: I cannot find or connect to my printer. What should I check first?**
**A:** Please check the following basic steps:
- **Bluetooth Status**: Ensure Bluetooth is enabled in your system settings (Windows or macOS).
- **Browser Check**: Enter `chrome://bluetooth-internals/#devices` in your browser's address bar. Check if your printer appears in the list and is being discovered correctly by the browser.

**Q: My printer doesn't show up in the pairing dialog on my Mac. What should I do?**
**A:** macOS can sometimes have trouble discovering certain Bluetooth devices. We recommend:
- **Using LightBlue**: Download the **LightBlue** app from the App Store. Use it to scan for Bluetooth devices and see if your printer (usually named starting with "LX") is detectable there.

**Q: The connection was lost or failed, and now I can't reconnect at all.**
**A:** Web Bluetooth connections can sometimes hang. For Mac users especially:
- **Fully Quit the Browser**: Simply closing the tab or window may not clear the Bluetooth cache. Use **`Command + Q`** to completely quit your browser (Chrome, etc.), then restart it and try connecting again.