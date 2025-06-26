"use client";

import React, { useState, ChangeEvent, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Github, Linkedin, Mail, Globe, Download } from 'lucide-react';
import { Analytics } from '@vercel/analytics/next';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface AnalysisResponse {
  similarity_score: number;
  missing_keywords: string[];
  summary: string;
  suggestion: string;
}

const ResumeAnalyzer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file || !jobDescription) {
      alert('Please upload a resume and provide a job description');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('jobDescription', jobDescription);

    try {
      console.log("API Base URL:", process.env.NEXT_PUBLIC_API_URL);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status}\n${errorText}`);
      }

      const data: AnalysisResponse = await response.json();
      console.log("Raw API response:", data);
      setAnalysis(data);

    } catch (error) {
      console.error('Error:', error);
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };
  const handleDownloadPDF = async () => {
  if (!analysis) return;

  const element = document.getElementById('pdf-report');
  if (!element) return;

  // Capture the full element as a canvas
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgProps = pdf.getImageProperties(imgData);

  const pdfWidth = pageWidth;
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  let heightLeft = pdfHeight;
  let position = 0;

  // Add the first page
  pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
  heightLeft -= pageHeight;

  // Add more pages if needed
  while (heightLeft > 0) {
    position = heightLeft - pdfHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;
  }

  pdf.save('resume_match_report.pdf');
};


  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-gray-100">
      <header className="py-12 px-4 bg-white shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-pink-50 opacity-70"></div>
        <div className="container mx-auto relative">
          <h1 className="text-5xl font-light text-center text-gray-800 tracking-tight">
            Resume <span className="font-semibold">Analyzer</span>
          </h1>
          <p className="text-center mt-4 text-gray-600 text-lg font-light">
            Elevate your application with AI-powered resume analysis
          </p>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-8">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-light text-gray-800">Upload Resume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-40 border border-dashed rounded-xl cursor-pointer bg-gray-50/50 hover:bg-gray-50 border-gray-200 hover:border-purple-200 transition-all duration-300">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-4 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-medium">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-400">PDF or DOCX (MAX. 10MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
                {file && (
                  <p className="mt-4 text-sm text-gray-500 text-center">
                    Selected: {file.name}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-light text-gray-800">Job Description</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Paste the job description here..."
                  className="min-h-[200px] border-gray-200 focus:border-purple-200 bg-white/60 placeholder:text-gray-400"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </CardContent>
            </Card>

            <Button 
              onClick={handleAnalyze} 
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Analyze Resume'}
            </Button>
          </div>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-light text-gray-800">Analysis Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] overflow-y-auto p-6 bg-white/60 rounded-xl space-y-4" ref={resultRef}>
                {analysis ? (
                          <div id="pdf-report" className="bg-white p-6 rounded-md shadow-md text-gray-800 space-y-4">
                            <h2 className="text-xl font-bold text-purple-700">Resume Match Report</h2>

                            <p className="text-sm">
                              <strong>Total Match Score:</strong>{' '}
                              <span
                                className={
                                  analysis.similarity_score > 75
                                    ? 'text-green-600'
                                    : analysis.similarity_score > 40
                                    ? 'text-yellow-600'
                                    : 'text-red-600'
                                }
                              >
                                {analysis.similarity_score}%
                              </span>
                            </p>

                            <div>
                              <strong className="text-gray-700">Missing Keywords:</strong>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {analysis.missing_keywords.map((word, index) => (
                                  <span key={index} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                                    {word}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div>
                            <strong className="text-gray-700">Suggestions:</strong>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {analysis.suggestion !== "Excellent keyword match!" ? (
                                analysis.suggestion
                                  .replace("Consider including: ", "")
                                  .split(", ")
                                  .map((word, index) => (
                                    <span
                                      key={index}
                                      className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm"
                                    >
                                      {word}
                                    </span>
                                  ))
                              ) : (
                                <span className="text-green-600 text-sm font-medium">
                                  {analysis.suggestion}
                                </span>
                              )}
                            </div>
                            </div>

                           

                            <Button
                              variant="outline"
                              className="mt-6 border border-gray-700 text-gray-800 hover:bg-gray-800 hover:text-white transition-colors duration-300"
                              onClick={handleDownloadPDF}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download Report
                            </Button>

                          </div>
                        ) : (
                          <p className="text-gray-400 text-center mt-8 font-light">
                            Your analysis results will appear here
                          </p>
                        ) }
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="mt-16 bg-white border-t border-gray-100">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center space-y-6">
            <p className="text-lg font-light text-gray-600">Connect with me</p>
            <div className="flex space-x-8">
              <a href="https://github.com/AshGod16/resume_analyzer" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-purple-600 transition-colors duration-300">
                <Github className="w-6 h-6" />
              </a>
              <a href="https://linkedin.com/in/akashgodbole" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-purple-600 transition-colors duration-300">
                <Linkedin className="w-6 h-6" />
              </a>
              <a href="mailto:akash.godbole16@gmail.com" className="text-gray-400 hover:text-purple-600 transition-colors duration-300">
                <Mail className="w-6 h-6" />
              </a>
              <a href="https://akashgodbole.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-purple-600 transition-colors duration-300">
                <Globe className="w-6 h-6" />
              </a>
            </div>
            <p className="text-sm text-gray-400 font-light">
              © {new Date().getFullYear()} Akash Godbole. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      <Analytics />
    </div>
  );
};

export default ResumeAnalyzer;
