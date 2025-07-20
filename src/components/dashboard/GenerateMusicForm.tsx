/**
 * GenerateMusicForm Component
 * 
 * - Users select from predefined UK curriculum stages, subjects, song styles, and moods.
 * - Optional fields for key learning objectives and additional instructions.
 * - On submission, sends a prompt to generate a song using an external API (Udio).
 * - Polls the external service periodically to check the song generation status,
 *   handling success, errors, and timeouts gracefully.
 * - Displays real-time status messages during generation and polling phases.
 * - Shows error alerts if generation fails or times out.
 * - Upon success, displays the generated song's lyrics and provides an audio player for playback.
 * - Includes a button linking to the song’s detailed library page.
 * 
 */

'use client';

import React, { useState } from "react";
import { generateMusic } from "@/lib/api/udio";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type GenerationState = 'idle' | 'generating' | 'polling' | 'success' | 'error';

const curriculumStages = [
  { value: "EYFS", label: "Early Years Foundation Stage (EYFS)" },
  { value: "KS1", label: "Key Stage 1 (Years 1-2)" },
  { value: "KS2_lower", label: "Key Stage 2 (Years 3-4)" },
  { value: "KS2_upper", label: "Key Stage 2 (Years 5-6)" },
  { value: "KS3", label: "Key Stage 3 (Years 7-9)" },
  { value: "KS4_GCSE", label: "Key Stage 4 / GCSE (Years 10-11)" },
  { value: "A_Level_Post16", label: "A-Level / Post-16 (Years 12-13)" },
  { value: "General_AllAges", label: "General / All Ages" },
  { value: "Other", label: "Other (Specify in details)" },
];
const subjects = [ "English", "Mathematics", "Science", "History", "Geography", "Art & Design", "Music", "Physical Education (PE)", "Computing / ICT", "Design & Technology (DT)", "Languages", "Religious Education (RE)", "PSHE / Citizenship", "Cross-Curricular", "Other" ];
const songStyles = [ "Upbeat Pop", "Pop Ballad", "Folk / Acoustic", "Rap / Hip-Hop", "Rock Anthem", "Classic Rock", "Blues Influence", "Jazz Influence", "Electronic / Dance", "Musical Theatre", "Lullaby / Calm", "March / Rhythmic", "Traditional / Nursery Rhyme", "AI Choice", "Other" ];
const moods = [ "Happy & Cheerful", "Energetic & Lively", "Calm & Relaxing", "Serious & Focused", "Inspiring & Motivational", "Funny & Playful", "Curious & Exploratory", "Thought-provoking", "Mysterious & Adventurous", "AI Choice", "Other" ];

export default function GenerateMusicForm() {
  const { refreshIdToken } = useAuth();
  const [curriculumStage, setCurriculumStage] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [songStyle, setSongStyle] = useState<string>("");
  const [mood, setMood] = useState<string>("");
  const [keyLearningObjective, setKeyLearningObjective] = useState<string>("");
  const [additionalDetails, setAdditionalDetails] = useState<string>("");
  const [generationState, setGenerationState] = useState<GenerationState>('idle');

  const resetForm = () => {
    setCurriculumStage("");
    setSubject("");
    setSongStyle("");
    setMood("");
    setKeyLearningObjective("");
    setAdditionalDetails("");
    setGenerationState("idle");
  };

  const handleGenerate = async () => {
    let constructedPrompt = "";
    if (curriculumStage && curriculumStage !== "Other") constructedPrompt += `For ${curriculumStage} students. `;
    if (subject && subject !== "Other") constructedPrompt += `The subject is ${subject}. `;
    if (keyLearningObjective.trim()) constructedPrompt += `Key learning objective: ${keyLearningObjective.trim()}. `;
    if (songStyle && songStyle !== "Other" && songStyle !== "AI Choice") constructedPrompt += `The song style should be ${songStyle}. `;
    else if (songStyle === "AI Choice") constructedPrompt += `The AI can choose the song style. `;
    if (mood && mood !== "Other" && mood !== "AI Choice") constructedPrompt += `The mood should be ${mood}. `;
    else if (mood === "AI Choice") constructedPrompt += `The AI can choose the mood. `;
    if (additionalDetails.trim()) constructedPrompt += `Additional details: ${additionalDetails.trim()}. `;

    if (!constructedPrompt.trim() && !additionalDetails.trim()) {
      toast.custom((t) => (
        <div
          className="bg-green-100 text-green-800 p-4 rounded shadow-md flex items-center gap-2"
          onClick={() => toast.dismiss(t)}
        >
          Please provide some details for the song you want to generate!.
        </div>
      ), {
          position: 'top-right',
      });
      return;
    }
    const finalPrompt = constructedPrompt.trim() ? constructedPrompt.trim() : additionalDetails.trim();

    setGenerationState('generating');

    try {
      const payload = { 
        prompt: finalPrompt, 
        gpt_description_prompt: finalPrompt, 
        custom_mode: false, 
        make_instrumental: false, 
        model: "chirp-v4.0",
      };
      const token = await refreshIdToken();
      if (!token) throw new Error("Authentication failed. Please log in again.");
      const response = await generateMusic(payload, token);

      if (!response.workId) {
        toast.custom((t) => (
          <div
            className="bg-red-300 text-red-800 p-4 rounded shadow-md flex items-center gap-2"
            onClick={() => toast.dismiss(t)}
          >
            Error generating song. Please try again later.!
          </div>
          ), {
            position: 'top-right',
        });

        setTimeout(() => {
        resetForm();
        }, 1500);

        return
      }

      toast.custom((t) => (
        <div
          className="bg-green-300 text-green-800 p-4 rounded shadow-md flex items-center gap-2"
          onClick={() => toast.dismiss(t)}
        >
          Your song is being processed. We&apos;ll notify you when it&apos;s ready!.
        </div>
      ), {
        position: 'top-right',
      });

      setTimeout(() => {
        resetForm();
      }, 1500);
    } catch (err: unknown) {
      console.error("Error generating song:", err);
      toast.custom((t) => (
        <div
          className="bg-red-300 text-red-800 p-4 rounded shadow-md flex items-center gap-2"
          onClick={() => toast.dismiss(t)}
        >
          Could not generate song!.
        </div>
        ), {
          position: 'top-right',
      });
    }
  };

  const isLoading = generationState === 'generating' || generationState === 'polling';

  return (
    <div className="space-y-4">
      <Card className="kid-friendly">
        <CardHeader>
          <CardTitle>🎶 Generate a Song</CardTitle>
          <CardDescription>Use the options below to craft your perfect educational song, or just type a description!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="curriculum-stage">UK Curriculum Stage/Level</Label>
              <Select value={curriculumStage} onValueChange={setCurriculumStage} disabled={isLoading}>
                <SelectTrigger id="curriculum-stage"><SelectValue placeholder="Select Stage/Level" /></SelectTrigger>
                <SelectContent>
                  {curriculumStages.map(stage => <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Select value={subject} onValueChange={setSubject} disabled={isLoading}>
                <SelectTrigger id="subject"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(sub => <SelectItem key={sub} value={sub}>{sub}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="song-style">Song Style/Genre</Label>
              <Select value={songStyle} onValueChange={setSongStyle} disabled={isLoading}>
                <SelectTrigger id="song-style"><SelectValue placeholder="Select Style/Genre" /></SelectTrigger>
                <SelectContent>
                  {songStyles.map(style => <SelectItem key={style} value={style}>{style}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="mood">Mood</Label>
              <Select value={mood} onValueChange={setMood} disabled={isLoading}>
                <SelectTrigger id="mood"><SelectValue placeholder="Select Mood" /></SelectTrigger>
                <SelectContent>
                  {moods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="key-learning-objective">Key Learning Objective (Optional)</Label>
            <Input
              id="key-learning-objective"
              placeholder="e.g., Understand the water cycle"
              value={keyLearningObjective}
              onChange={(e) => setKeyLearningObjective(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="additional-details">Optional Additional Details / Specific Instructions</Label>
            <Textarea
              id="additional-details"
              placeholder="e.g., Mention a friendly talking squirrel, include a catchy chorus, make it about 2 minutes long..."
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>
          <Button onClick={handleGenerate} disabled={isLoading} className="w-full md:w-auto">
             Generate Song
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
