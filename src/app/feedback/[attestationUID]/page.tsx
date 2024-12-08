//@ts-nocheck

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAppKitProvider, useAppKitAccount } from "@reown/appkit/react";
import { Wallet, Star, Send, ChevronRight } from 'lucide-react';
import { toast } from "react-hot-toast";
import { ethers } from 'ethers';
import contractABI from "@/contract/abi.json";
import contractAddress from "@/contract/address.json";
import { pinata } from "@/utils/config";
import { decodeUint32ToString, convertStringToUint32 } from "@/utils/ipfs";
import { EAS, SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";

const EASContractAddress = "0x4200000000000000000000000000000000000021";
const SchemaUID = "0x0353438abb8fc94491aa6c3629823c9ddcd0d7b28df6aa9a5281bbb5ff3bb6bb";
const RPC_URL = "https://sepolia.base.org";

interface ServiceData {
  name: string;
  description: string;
  feedbackQuestions: string[];
}

interface FeedbackData {
  service: string;
  ratings: number[];
  overallRating: number;
  remarks: string;
}

export default function MagicLinkFeedback() {
  const [step, setStep] = useState<"connect" | "feedback" | "submitted">("connect");
  const [serviceData, setServiceData] = useState<ServiceData | null>(null);
  const [ratings, setRatings] = useState<number[]>([]);
  const [overallRating, setOverallRating] = useState(0);
  const [remarks, setRemarks] = useState("");
  const { walletProvider } = useAppKitProvider();
  const { address, isConnected } = useAppKitAccount();
  const params = useParams();

  useEffect(() => {
    if (isConnected) {
      verifyUser();
    }
  }, [isConnected]);

  useEffect(() => {
    if (serviceData) {
      setRatings(new Array(serviceData.feedbackQuestions.length).fill(0));
    }
  }, [serviceData]);

  const getContract = async () => {
    try {
      const ethersProvider = new ethers.JsonRpcProvider(RPC_URL);
      const contractRead = new ethers.Contract(
        contractAddress.address,
        contractABI,
        ethersProvider
      );
      return { contractRead };
    } catch (error) {
      console.error("Failed to fetch contract:", error);
      toast.error("Failed to fetch contract. Please try again.");
      throw error;
    }
  };

  const fetchService = async (serviceId: bigint) => {
    try {
      const { contractRead } = await getContract();
      const serviceMetaData = await contractRead.getServiceMetadata(serviceId);
      const IpfsHash = serviceMetaData;
      const ipfsUrl = await pinata.gateways.convert(IpfsHash);
      const response = await fetch(ipfsUrl);
      const data = await response.json();
      setServiceData(data);
    } catch (error) {
      console.error("Failed to fetch service:", error);
      toast.error("Failed to fetch service. Please try again.");
    }
  };

  const getAttestation = async () => {
    try {
      const attestationUID = params.attestationUID as string;
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const eas = new EAS(EASContractAddress);
      eas.connect(provider);

      const attestation = await eas.getAttestation(attestationUID);
      return attestation;
    } catch (error) {
      console.error("Failed to retrieve attestation:", error);
      toast.error("Failed to retrieve attestation. Please try again.");
      throw error;
    }
  };

  const verifyUser = async () => {
    try {
      const attestation = await getAttestation();
      if (address.toLowerCase() !== attestation.recipient.toLowerCase()) {
        toast.error("Please connect with the correct wallet address!");
        return;
      }
      const serviceId = await getServiceId(attestation);
      await fetchFeedbackForm(serviceId);
      setStep("feedback");
    } catch (error) {
      console.error("Error verifying user:", error);
      toast.error("Failed to verify user. Please try again.");
    }
  };

  const getServiceId = async (attestation: any) => {
    const schemaEncoder = new SchemaEncoder("uint256 service_id");
    const decodedData = schemaEncoder.decodeData(attestation.data);
    const serviceId = BigInt(decodedData[0].value.value.toString());
    // console.log(decodedData);
    // const serviceId = BigInt(attestation.data);
    return serviceId;
  };

  const fetchFeedbackForm = async (serviceId: bigint) => {
    await toast.promise(
      fetchService(serviceId),
      {
        loading: 'Loading feedback form...',
        success: 'Feedback form loaded successfully',
        error: 'Failed to load feedback form',
      }
    );
  };

  const handleRatingChange = (index: number, rating: number) => {
    const newRatings = [...ratings];
    newRatings[index] = rating;
    setRatings(newRatings);
  };

  const handleSubmit = async () => {
    const feedbackData = {
      ratings,
      overallRating,
      remarks,
      attestationUID: params.attestationUID as string,
    };

    try {
      console.log(feedbackData);

        const agentPromise = toast.promise(
          fetch('/api/agent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(feedbackData),
          }).then(response => response.json()),
          {
            loading: 'Submitting feedback...',
            success: 'Feedback submitted successfully!',
            error: 'Failed to submit feedback',
          }
      );
      // TODO: Implement sending feedback to AI Agent
      await agentPromise;
      setStep("submitted");
      toast.success("Feedback submitted successfully!");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
    }
  };

  const isFormValid = () => {
    return ratings.every((r) => r > 0) && overallRating > 0;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="px-6 py-4 bg-black text-white">
        <div className="container mx-auto flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="text-xl font-bold"
          >
            Mumei
          </motion.div>
          <w3m-button size="sm" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <CardTitle className="text-2xl font-bold text-gray-800">
              {serviceData ? serviceData.name : "Service Feedback"}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {serviceData ? serviceData.description : "Share your experience"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <AnimatePresence mode="wait">
              {step === "connect" && (
                <motion.div
                  key="connect"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-12"
                >
                  <Wallet className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h2 className="text-xl font-semibold mb-2 text-gray-800">
                    Connect Your Wallet
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Please connect your wallet to access the feedback form.
                  </p>
                  <div className="flex justify-center">
                    <w3m-button size="md" />
                  </div>
                </motion.div>
              )}
              {step === "feedback" && serviceData && (
                <motion.div
                  key="feedback"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {serviceData.feedbackQuestions.map((question, index) => (
                    <motion.div
                      key={index}
                      className="space-y-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <h3 className="font-medium text-gray-700">{question}</h3>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <Button
                            key={rating}
                            variant={ratings[index] === rating ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleRatingChange(index, rating)}
                            className={`flex-1 ${
                              ratings[index] === rating
                                ? "bg-black text-white hover:bg-gray-800"
                                : "border-gray-300 text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {rating}
                          </Button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                  <motion.div
                    className="space-y-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: serviceData.feedbackQuestions.length * 0.1,
                    }}
                  >
                    <h3 className="font-medium text-gray-700">Overall Rating</h3>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <Button
                          key={rating}
                          variant={overallRating === rating ? "default" : "outline"}
                          size="sm"
                          onClick={() => setOverallRating(rating)}
                          className={`flex-1 ${
                            overallRating === rating
                              ? "bg-black text-white hover:bg-gray-800"
                              : "border-gray-300 text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <Star
                            className={`w-4 h-4 ${
                              overallRating >= rating ? "fill-current" : ""
                            }`}
                          />
                        </Button>
                      ))}
                    </div>
                  </motion.div>
                  <motion.div
                    className="space-y-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: (serviceData.feedbackQuestions.length + 1) * 0.1,
                    }}
                  >
                    <h3 className="font-medium text-gray-700">Additional Remarks</h3>
                    <Textarea
                      placeholder="Any additional comments or suggestions?"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </motion.div>
                </motion.div>
              )}
              {step === "submitted" && (
                <motion.div
                  key="submitted"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-12"
                >
                  <Send className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  <h2 className="text-2xl font-bold mb-2 text-gray-800">Thank You!</h2>
                  <p className="text-gray-600">
                    Your feedback has been submitted successfully.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
          {step === "feedback" && (
            <CardFooter className="bg-gray-50 border-t border-gray-200">
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid()}
                className="w-full bg-black text-white hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-colors duration-200"
              >
                Submit Feedback
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          )}
        </Card>
      </main>
    </div>
  );
}

