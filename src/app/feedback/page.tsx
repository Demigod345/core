//@ts-nocheck

"use client";


import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Mail } from 'lucide-react'

export default function ErrorPage() {
  const handleCheckEmail = () => {
    window.open("https://app.mailchain.com/inbox", "_blank", "noopener,noreferrer")
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="px-6 py-4 bg-black text-white">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Mumei</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto bg-white border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Wrong Page!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center py-12"
            >
              <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Incorrect Access</h2>
              <p className="text-gray-500 mb-6">Please follow the link received in your email to access the correct page.</p>
              <Button 
                className="bg-black text-white hover:bg-gray-800"
                onClick={handleCheckEmail}
              >
                <Mail className="w-4 h-4 mr-2" />
                Check Your Email
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}