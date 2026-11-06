const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = 3000;
const DATA_FILE = path.join(__dirname, "registrations.json");

const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8"
};

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
    });
    res.end(JSON.stringify(data));
}

function readStudents() {
    if (!fs.existsSync(DATA_FILE)) {
        return [];
    }

    const contents = fs.readFileSync(DATA_FILE, "utf8");
    return contents.trim() ? JSON.parse(contents) : [];
}

const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/register") {
        let body = "";
        let tooLarge = false;

        req.on("data", chunk => {
            body += chunk;
            if (body.length > 10000) {
                tooLarge = true;
                sendJson(res, 413, { message: "The submitted form is too large." });
                req.destroy();
            }
        });

        req.on("end", () => {
            if (tooLarge) return;

            try {
                const student = JSON.parse(body);

                const name = typeof student.name === "string" ? student.name.trim() : "";
                const email = typeof student.email === "string"
                    ? student.email.trim().toLowerCase() : "";
                const studentClass = typeof student.studentClass === "string"
                    ? student.studentClass : "";
                const password = typeof student.password === "string"
                    ? student.password : "";

                const allowedClasses = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];

                if (!name || !email || !studentClass || !password) {
                    return sendJson(res, 400, { message: "Please fill in all fields." });
                }

                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    return sendJson(res, 400, { message: "Please enter a valid email address." });
                }

                if (!allowedClasses.includes(studentClass)) {
                    return sendJson(res, 400, { message: "Please select a valid class." });
                }

                if (password.length < 8) {
                    return sendJson(res, 400, {
                        message: "Password must have at least 8 characters."
                    });
                }

                const students = readStudents();

                if (students.some(existing => existing.email === email)) {
                    return sendJson(res, 409, {
                        message: "This email is already registered."
                    });
                }

                const salt = crypto.randomBytes(16).toString("hex");
                const passwordHash = crypto.scryptSync(password, salt, 64).toString("hex");

                students.push({
                    id: crypto.randomUUID(),
                    name,
                    email,
                    studentClass,
                    salt,
                    passwordHash,
                    registeredAt: new Date().toISOString()
                });

                fs.writeFileSync(DATA_FILE, JSON.stringify(students, null, 2), {
                    mode: 0o600
                });

                return sendJson(res, 201, { message: "Registration successful!" });
            } catch (error) {
                console.error("Registration error:", error.message);
                return sendJson(res, 400, {
                    message: "Could not process the registration. Please try again."
                });
            }
        });

        return;
    }

    if (req.method === "GET") {
        const requestedPath = req.url === "/" ? "/index.html" : req.url;
        const allowedFiles = ["/index.html", "/style.css", "/script.js"];

        if (!allowedFiles.includes(requestedPath)) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            return res.end("Page not found");
        }

        const filePath = path.join(__dirname, requestedPath.slice(1));

        fs.readFile(filePath, (error, content) => {
            if (error) {
                res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
                return res.end("Could not load the website file.");
            }

            res.writeHead(200, {
                "Content-Type": contentTypes[path.extname(filePath)],
                "X-Content-Type-Options": "nosniff"
            });
            res.end(content);
        });

        return;
    }

    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method not allowed");
});

server.listen(PORT, () => {
    console.log("School registration server is running!");
    console.log(`Open http://localhost:${PORT}`);
});
