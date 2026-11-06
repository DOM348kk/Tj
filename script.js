const images = document.querySelectorAll(".carousel-image");

let current = 0;

function showImages() {

    images.forEach((image, index) => {

        let position = index - current;

        if (position > images.length / 2) {
            position -= images.length;
        }

        if (position < -images.length / 2) {
            position += images.length;
        }

        image.style.transform = `
            translate(-50%, -50%)
            translateX(${position * 300}px)
            translateZ(${Math.abs(position) === 0 ? 100 : -100}px)
            rotateY(${position * -15}deg)
            scale(${position === 0 ? 1 : 0.75})
        `;

        image.style.zIndex = 10 - Math.abs(position);

        image.style.opacity =
            Math.abs(position) > 2 ? 0 : 1;

    });

}

document.getElementById("next").onclick = function () {
    current = (current + 1) % images.length;
    showImages();
};

document.getElementById("prev").onclick = function () {
    current = (current - 1 + images.length) % images.length;
    showImages();
};

showImages();