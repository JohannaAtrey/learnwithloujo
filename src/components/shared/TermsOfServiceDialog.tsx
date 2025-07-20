'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Shield, Cookie, Accessibility } from 'lucide-react';

export function TermsOfServiceDialog({ trigger }: { trigger: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto bg-white/80 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Terms of Service & Policies</DialogTitle>
          <DialogDescription>
            Please review our terms, policies, and statements before using our service.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="terms" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="terms"><FileText className="w-4 h-4 mr-2" /> Terms of Service</TabsTrigger>
            <TabsTrigger value="privacy"><Shield className="w-4 h-4 mr-2" /> Privacy Policy</TabsTrigger>
            <TabsTrigger value="cookies"><Cookie className="w-4 h-4 mr-2" /> Cookie Policy</TabsTrigger>
            <TabsTrigger value="accessibility"><Accessibility className="w-4 h-4 mr-2" /> Accessibility</TabsTrigger>
          </TabsList>
          <TabsContent value="terms" className="prose prose-sm max-w-none">
            <h2>Terms of Service</h2>
            <p>Welcome to Loujo! These terms and conditions outline the rules and regulations for the use of our website and services.</p>
            <p>By accessing this website we assume you accept these terms and conditions. Do not continue to use Loujo if you do not agree to take all of the terms and conditions stated on this page.</p>
            <h3>License</h3>
            <p>Unless otherwise stated, Loujo and/or its licensors own the intellectual property rights for all material on Loujo. All intellectual property rights are reserved. You may access this from Loujo for your own personal use subjected to restrictions set in these terms and conditions.</p>
            <p>You must not:</p>
            <ul>
                <li>Republish material from Loujo</li>
                <li>Sell, rent or sub-license material from Loujo</li>
                <li>Reproduce, duplicate or copy material from Loujo</li>
                <li>Redistribute content from Loujo</li>
            </ul>
            <p>This Agreement shall begin on the date hereof.</p>
          </TabsContent>
          <TabsContent value="privacy" className="prose prose-sm max-w-none">
            <h2>Privacy Policy</h2>
            <p>Your privacy is important to us. It is Loujo&apos;s policy to respect your privacy regarding any information we may collect from you across our website, and other sites we own and operate.</p>
            <p>We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we&apos;re collecting it and how it will be used.</p>
            <p>We only retain collected information for as long as necessary to provide you with your requested service. What data we store, we&apos;ll protect within commercially acceptable means to prevent loss and theft, as well as unauthorized access, disclosure, copying, use or modification.</p>
            <p>We don&apos;t share any personally identifying information publicly or with third-parties, except when required to by law.</p>
          </TabsContent>
          <TabsContent value="cookies" className="prose prose-sm max-w-none">
            <h2>Cookie Policy</h2>
            <p>We use cookies to help improve your experience of our website. This cookie policy is part of Loujo&apos;s privacy policy, and covers the use of cookies between your device and our site.</p>
            <p>If you don&apos;t wish to accept cookies from us, you should instruct your browser to refuse cookies from our website, with the understanding that we may be unable to provide you with some of your desired content and services.</p>
            <h3>What is a cookie?</h3>
            <p>A cookie is a small piece of data that a website stores on your device when you visit, typically containing information about the website itself, a unique identifier that allows the site to recognize your web browser when you return, additional data that serves the purpose of the cookie, and the lifespan of the cookie itself.</p>
          </TabsContent>
          <TabsContent value="accessibility" className="prose prose-sm max-w-none">
            <h2>Accessibility Statement</h2>
            <p>We are committed to ensuring that our website is accessible to everyone, regardless of ability or technology. We are actively working to increase the accessibility and usability of our website and in doing so adhere to many of the available standards and guidelines.</p>
            <p>Whilst Loujo strive to adhere to the accepted guidelines and standards for accessibility and usability, it is not always possible to do so in all areas of the website. We are continually seeking out solutions that will bring all areas of the site up to the same level of overall web accessibility.</p>
            <p>If you should experience any difficulty in accessing the Loujo website, please don&apos;t hesitate to contact us.</p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 