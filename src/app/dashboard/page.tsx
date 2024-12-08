// @ts-nocheck

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Lock, Shield, UserCheck, Zap, PlusCircle, DollarSign, BarChart2, MessageSquare, Gift, ChevronRight, Activity, Star, ThumbsUp, ThumbsDown, ChevronLeft, ChevronDown, Filter } from 'lucide-react'
import { useAppKitProvider, useAppKitAccount } from "@reown/appkit/react"
import { ethers } from 'ethers'
import contractABI from "@/contract/abi.json"
import contractAddress from "@/contract/address.json"
import { toast } from 'react-hot-toast'
import { pinata } from "@/utils/config"

interface Service {
  id: number
  ipfsUrl: string
  name: string
  description: string
  interactions: number
  feedbacks: number
  feedbackQuestions: string[]
}

interface ServiceFormData {
  name: string
  description: string
  feedbackQuestions: string[]
}

export default function Dashboard() {
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [isAddingService, setIsAddingService] = useState(false)
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const { walletProvider } = useAppKitProvider()
  const { address, isConnected } = useAppKitAccount()

  const getContract = async () => {
    if (!isConnected) {
      toast.error("Wallet not connected")
      return null
    }
    try {
      const ethersProvider = new ethers.BrowserProvider(window.ethereum)
      const signer = await ethersProvider.getSigner()
      const contractRead = new ethers.Contract(
        contractAddress.address,
        contractABI,
        ethersProvider
      );
      const contractWrite = new ethers.Contract(
        contractAddress.address,
        contractABI,
        signer
      )
      return {contractRead, contractWrite};
    } catch (error) {
      toast.error("Failed to fetch contract: " + error.message)
      return null
    }
  }

  const uploadServiceToIPFS = async (serviceData: ServiceFormData): Promise<string> => {
    return toast.promise(
      fetch("/api/service", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData),
      }).then(response => response.json()),
      {
        loading: 'Uploading service data to IPFS...',
        success: 'Service data uploaded to IPFS',
        error: 'Failed to upload service data to IPFS',
      }
    )
  }
  
  const addService = async (serviceData: ServiceFormData) => {
    try {
      const ipfsUrl = await uploadServiceToIPFS(serviceData)
      const {contractRead, contractWrite} = await getContract();
      if (!contractRead || !contractWrite) return

      await toast.promise(
        (async () => {
          const tx = await contractWrite.registerService(ipfsUrl);
          const receipt = await tx.wait();
          console.log(receipt);
          return receipt;
        })(),
        {
          loading: 'Registering service on the blockchain...',
          success: 'Service registered successfully',
          error: 'Failed to register service',
        }
      );

      await fetchServices()
    } catch (error) {
      toast.error("Error adding service: " + error.message)
    }
  }

  const handleAddService = async (serviceData: ServiceFormData) => {
    setIsAddingService(false)
    await addService(serviceData)
  }

  const fetchServices = async () => {
    try {
      const {contractRead, contractWrite} = await getContract();
      if (!contractRead || !contractWrite) return

      const serviceIds = await contractRead.getServiceIdsByOwner(address)
      const servicesPromises = serviceIds.map(async (serviceId) => {
        const serviceMetaData = await contractRead.getServiceMetadata(BigInt(serviceId))
        const ipfsUrl = await pinata.gateways.convert(serviceMetaData)
        const response = await fetch(ipfsUrl)
        const data = await response.json()
        const feedbacks = await contractRead.getTotalFeedbacks(BigInt(serviceId))
        const interactions = await contractRead.getTotalInteractions(BigInt(serviceId))
        return {
          id: serviceId.toString(),
          ipfsUrl: ipfsUrl,
          name: data.name,
          description: data.description,
          interactions: interactions.toString(),
          feedbacks: feedbacks.toString(),
          feedbackQuestions: data.feedbackQuestions,
        }
      })

      const newServices = await toast.promise(
        Promise.all(servicesPromises),
        {
          loading: 'Fetching services...',
          success: 'Services fetched successfully',
          error: 'Failed to fetch services',
        }
      )
      setServices(newServices)
    } catch (error) {
      toast.error("Failed to fetch services: " + error.message)
    }
  }

  const viewServiceDetails = async (service: Service) => {
    setSelectedService(service)
    try {
      const {contractRead, contractWrite} = await getContract();
      if (!contractRead || !contractWrite) return

      const feedbacksData = await contractWrite.getAllFeedbacks(BigInt(service.id))
      console.log(feedbacksData);
      const feedbacksPromises = feedbacksData.map(async (feedbackMetaData) => {
        const IpfsHash = feedbackMetaData;
        const ipfsUrl = await pinata.gateways.convert(IpfsHash)
        const response = await fetch(ipfsUrl)
        return response.json()
      })

      const fetchedFeedbacks = await toast.promise(
        Promise.all(feedbacksPromises),
        {
          loading: 'Fetching feedbacks...',
          success: 'Feedbacks fetched successfully',
          error: 'Failed to fetch feedbacks',
        }
      )

      console.log(fetchedFeedbacks);
      setFeedbacks(fetchedFeedbacks)
    } catch (error) {
      toast.error("Failed to fetch feedbacks: " + error.message)
    }
  }

  useEffect(() => {
    if (isConnected) {
      toast.success("Wallet connected")
      fetchServices()
    } else {
      toast.error("Wallet not connected")
    }
  }, [isConnected])

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <header className="px-6 py-4 bg-black text-white">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Mumei</h1>
          <nav className="flex space-x-2">
            <Button variant="ghost" className="text-white hover:text-black">Services</Button>
            <Button variant="ghost" className="text-white hover:text-black">Analytics</Button>
          </nav>
          <w3m-button size='sm'/>
        </div>
      </header>
      <main className="flex-1 p-6 bg-gray-50">
        <div className="container mx-auto">
          {!selectedService ? (
            <ServicesList
              services={services}
              onAddService={() => setIsAddingService(true)}
              onViewDetails={viewServiceDetails}
            />
          ) : (
            <ServiceDetails
              service={selectedService}
              feedbacks={feedbacks}
              onBack={() => setSelectedService(null)}
            />
          )}
        </div>
      </main>
      <Dialog open={isAddingService} onOpenChange={setIsAddingService}>
        <DialogContent className="sm:max-w-[425px] bg-white text-black">
          <DialogHeader>
            <DialogTitle className="text-black">Add New Service</DialogTitle>
            <DialogDescription className="text-gray-600">Enter the details for your new service.</DialogDescription>
          </DialogHeader>
          <AddServiceForm onSubmit={handleAddService} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ServicesList({ services, onAddService, onViewDetails }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-black">Your Services</h2>
        <Button onClick={onAddService} className="bg-black hover:bg-gray-800 text-white">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Service
        </Button>
      </div>
      {services.length === 0 ? (
        <Card className="bg-white border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-xl font-semibold text-gray-600 mb-2">No services found</p>
            <p className="text-gray-500 mb-4">Get started by adding your first service</p>
            <Button onClick={onAddService} className="bg-black hover:bg-gray-800 text-white">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Service
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="bg-white border-gray-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-black">{service.id}: {service.name}</CardTitle>
                <CardDescription className="text-gray-600">
                  {service.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-gray-600 mb-4">
                  <div className="flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-green-600" />
                    <span>{service.interactions} Interactions</span>
                  </div>
                  <div className="flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2 text-yellow-600" />
                    <span>{service.feedbacks} Feedbacks</span>
                  </div>
                </div>
                <Button onClick={() => onViewDetails(service)} variant="outline" className="w-full text-black border-black hover:bg-black hover:text-white">
                  View Details <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {services.length > 0 && <ServicesAnalytics services={services} />}
    </div>
  )
}

function ServicesAnalytics({ services }) {
  const analyticsData = services.map(service => ({
    name: service.name,
    interactions: parseInt(service.interactions),
    feedbacks: parseInt(service.feedbacks),
  }))

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <CardTitle className="text-black">Services Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analyticsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#4B5563" />
              <YAxis stroke="#4B5563" />
              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }} />
              <Legend />
              <Bar dataKey="interactions" fill="#000000" name="Interactions" />
              <Bar dataKey="feedbacks" fill="#4B5563" name="Feedbacks" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function ServiceDetails({ service, feedbacks, onBack }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-black">{service.name}</h2>
        <Button onClick={onBack} variant="outline" className="text-black border-black hover:bg-black hover:text-white">
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Services
        </Button>
      </div>
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-black">Service Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">{service.description}</p>
        </CardContent>
      </Card>
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-black">Raw Feedback Data</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
            <code>{JSON.stringify(feedbacks, null, 2)}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

function AddServiceForm({ onSubmit }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [feedbackQuestions, setFeedbackQuestions] = useState<string[]>([''])

  const handleAddQuestion = () => {
    setFeedbackQuestions([...feedbackQuestions, ''])
  }

  const handleQuestionChange = (index: number, value: string) => {
    const updatedQuestions = [...feedbackQuestions]
    updatedQuestions[index] = value
    setFeedbackQuestions(updatedQuestions)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ name, description, feedbackQuestions })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name" className="text-black">Service Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="bg-white text-black border-gray-300" />
      </div>
      <div>
        <Label htmlFor="description" className="text-black">Description</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required className="bg-white text-black border-gray-300" />
      </div>
      <div>
        <Label className="text-black">Feedback Questions</Label>
        {feedbackQuestions.map((question, index) => (
          <div key={index} className="mt-2">
            <Input
              placeholder="Enter your question"
              value={question}
              onChange={(e) => handleQuestionChange(index, e.target.value)}
              required
              className="bg-white text-black border-gray-300"
            />
          </div>
        ))}
        <Button type="button" onClick={handleAddQuestion} variant="outline" className="mt-2 text-black border-black hover:bg-black hover:text-white">
          Add Question
        </Button>
      </div>
      <Button type="submit" className="bg-black hover:bg-gray-800 text-white">Add Service</Button>
    </form>
  )
}

export { ServicesList, ServicesAnalytics, ServiceDetails, AddServiceForm }

