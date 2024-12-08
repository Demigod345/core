//@ts-nocheck

import { NextResponse, NextRequest } from "next/server";
import { main } from "./chatbot";
import { EAS, SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";
const EASContractAddress = "0x4200000000000000000000000000000000000021";
const SchemaUID = "0x0353438abb8fc94491aa6c3629823c9ddcd0d7b28df6aa9a5281bbb5ff3bb6bb";
const RPC_URL = "https://sepolia.base.org";
import { pinata } from "@/utils/config";
import contractABI from "@/contract/abi.json";
import contractAddress from "@/contract/address.json";


// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };



    
// Add a listner that checks for POST req with this type of given data

// { ServiceId: ...,
//   UserId: ...,
//   StarReview: ...,
//   Review: ...,
//   QuestionResponse: [{Question: "How much you liked the product?", Response: 1 (out of 5)},...] (basically an array of objects)
// }

const getAttestation = async (attestationUID) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const eas = new EAS(EASContractAddress);
    eas.connect(provider);

    const attestation = await eas.getAttestation(attestationUID);
    return attestation;
  } catch (error) {
    console.error("Failed to retrieve attestation:", error);
    throw error;
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


export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log(data);
    const attestation = await getAttestation(data.attestationUID);
    const user = attestation.recipient;
    const serviceId = await getServiceId(attestation);

    // const result = await addPayoutData(payout);
    const r = await main(data.remarks, user, serviceId);
    const dataS = {
      response: r,
    }
    console.log("Summary: ", r);

    const uploadData = await pinata.upload.json(dataS);
    console.log(uploadData);

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(contractAddress.address, contractABI, signer);

    const tx = await contract.submitFeedback(uploadData.IpfsHash, serviceId);
    await tx.wait();
    console.log("Transaction hash: ", tx.hash);

    // // // This triggers the function from chatbot
    if (r) {
      return NextResponse.json({ response: r }, { status: 200 });
    }
    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
  
}