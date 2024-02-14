"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMarkdownFile = void 0;
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const git_1 = require("./git");
async function createMarkdownFile(articles, outputDir, branch) {
    // output directory must exist
    if (!fs.existsSync(outputDir)) {
        try {
            // Create the directory with necessary permissions
            fs.mkdirSync(outputDir);
        }
        catch (error) {
            core.setFailed(`Failed to create directory ${outputDir}: ${error.message}`);
            return;
        }
    }
    const commits = [];
    for (const article of articles) {
        const fileName = (0, git_1.getFileNameFromTitle)(article.title);
        const filePath = `${outputDir}/${fileName}.md`;
        // Check if the markdown file already exists
        if (!fs.existsSync(filePath)) {
            const commitMessage = `Add ${fileName}`;
            const markdownContent = `---
title: "${article.title}"
description: "${article.description}"
cover_image: "${article.cover_image || ""}"
tags: [${article.tag_list.map((tag) => `"${tag}"`).join(", ")}]
url: "${article.url}"
created_at: "${article.published_timestamp}"
---

`;
            core.notice(`markdown content`);
            // Write markdown content to file
            fs.writeFileSync(filePath, markdownContent);
            core.notice(`push start`);
            commits.push({ message: commitMessage, filePath });
            core.notice(`Markdown file created: ${filePath}`);
        }
        else {
            core.notice(`Markdown file already exists for "${article.title}". Skipping.`);
        }
    }
    if (commits.length > 0) {
        await createCommitAndPush(branch, commits);
    }
}
exports.createMarkdownFile = createMarkdownFile;
async function createCommitAndPush(branch, commits) {
    try {
        // Authenticate with GitHub using your personal access token
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            throw new Error("GitHub token is missing. Make sure to set the GITHUB_TOKEN secret.");
        }
        const commitData = {
            branch,
            commits: commits.map(({ message, filePath }) => {
                const content = fs.readFileSync(filePath, "utf8");
                return {
                    message,
                    content: Buffer.from(content).toString("base64")
                };
            })
        };
        // Create a new commit using the GitHub REST API
        await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/git/commits`, {
            method: "POST",
            headers: {
                Authorization: `token ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(commitData)
        });
    }
    catch (error) {
        throw new Error(`Failed to create commit: ${error.message}`);
    }
}
