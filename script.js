document.addEventListener('DOMContentLoaded', () => {
    const imageUpload = document.getElementById('imageUpload');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const convertToPdfButton = document.getElementById('convertToPdfButton');
    const statusMessage = document.getElementById('statusMessage');
    const fileCountDisplay = document.getElementById('fileCount');
    const pageSizeSelect = document.getElementById('pageSize');
    const orientationSelect = document.getElementById('orientation');
    const imageFitSelect = document.getElementById('imageFit');

    let selectedFiles = [];

    // Ensure jsPDF is loaded
    if (typeof jspdf === 'undefined') {
        statusMessage.textContent = "Error: jsPDF library not loaded. Please check your internet connection or the CDN link.";
        console.error("jsPDF is not loaded!");
        return;
    }
    const { jsPDF } = jspdf; // Destructure jsPDF from the global jspdf object

    imageUpload.addEventListener('change', (event) => {
        selectedFiles = Array.from(event.target.files);
        updatePreviews();
        updateConvertButtonState();
        fileCountDisplay.textContent = `${selectedFiles.length} file(s) selected`;
        statusMessage.textContent = ""; // Clear previous status
    });

    function updatePreviews() {
        imagePreviewContainer.innerHTML = ''; // Clear existing previews
        selectedFiles.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.classList.add('preview-image');
                    img.title = file.name;
                    imagePreviewContainer.appendChild(img);
                }
                reader.readAsDataURL(file);
            }
        });
    }

    function updateConvertButtonState() {
        convertToPdfButton.disabled = selectedFiles.length === 0;
    }

    convertToPdfButton.addEventListener('click', async () => {
        if (selectedFiles.length === 0) {
            statusMessage.textContent = "Please select images first.";
            return;
        }

        statusMessage.textContent = "Converting to PDF, please wait...";
        convertToPdfButton.disabled = true;

        try {
            const pageSize = pageSizeSelect.value;
            const orientation = orientationSelect.value;
            const imageFit = imageFitSelect.value;

            const pdf = new jsPDF({
                orientation: orientation,
                unit: 'pt', // points
                format: pageSize
            });

            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                const imgData = await readFileAsDataURL(file);
                const imgProps = await getImageProperties(imgData);

                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                
                // Margins (optional, adjust as needed)
                const margin = 20; // 20 points margin
                const availableWidth = pageWidth - 2 * margin;
                const availableHeight = pageHeight - 2 * margin;

                let imgWidth = imgProps.width;
                let imgHeight = imgProps.height;
                let ratio = imgWidth / imgHeight;

                let pdfImgWidth, pdfImgHeight, x, y;

                if (imageFit === 'contain') {
                    if (imgWidth / availableWidth > imgHeight / availableHeight) {
                        // Fit by width
                        pdfImgWidth = availableWidth;
                        pdfImgHeight = availableWidth / ratio;
                    } else {
                        // Fit by height
                        pdfImgHeight = availableHeight;
                        pdfImgWidth = availableHeight * ratio;
                    }
                     // Center the image
                    x = margin + (availableWidth - pdfImgWidth) / 2;
                    y = margin + (availableHeight - pdfImgHeight) / 2;

                } else { // imageFit === 'cover'
                    if (imgWidth / availableWidth < imgHeight / availableHeight) {
                        // Image is "taller" than page aspect ratio, fit by width and crop height
                        pdfImgWidth = availableWidth;
                        pdfImgHeight = availableWidth / ratio;
                        x = margin;
                        y = margin - (pdfImgHeight - availableHeight) / 2; // Center vertically
                    } else {
                        // Image is "wider" than page aspect ratio, fit by height and crop width
                        pdfImgHeight = availableHeight;
                        pdfImgWidth = availableHeight * ratio;
                        y = margin;
                        x = margin - (pdfImgWidth - availableWidth) / 2; // Center horizontally
                    }
                }


                if (i > 0) {
                    pdf.addPage();
                }
                pdf.addImage(imgData, imgProps.type.split('/')[1].toUpperCase(), x, y, pdfImgWidth, pdfImgHeight);
            }

            pdf.save('converted_images.pdf');
            statusMessage.textContent = "PDF generated successfully!";
            statusMessage.style.color = '#2ecc71'; // Green for success

        } catch (error) {
            console.error("Error generating PDF:", error);
            statusMessage.textContent = `Error: ${error.message || "Could not generate PDF."}`;
            statusMessage.style.color = '#e74c3c'; // Red for error
        } finally {
            convertToPdfButton.disabled = selectedFiles.length === 0; // Re-enable based on selection
        }
    });

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    }

    function getImageProperties(imageDataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height,
                    type: getImageTypeFromDataURL(imageDataUrl) // Get actual type
                });
            };
            img.onerror = (error) => {
                console.error("Error loading image for properties:", error);
                reject(new Error("Could not load image to get its properties."));
            }
            img.src = imageDataUrl;
        });
    }

    function getImageTypeFromDataURL(dataURL) {
        // e.g., "data:image/png;base64,..." -> "image/png"
        return dataURL.substring(dataURL.indexOf(":") + 1, dataURL.indexOf(";"));
    }

    updateConvertButtonState(); // Initial state
});