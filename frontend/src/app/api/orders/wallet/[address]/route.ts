import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params
    
    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }
    
    const response = await fetch(`${BACKEND_URL}/api/orders/wallet/${address}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch orders for wallet')
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching orders for wallet:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders for wallet' },
      { status: 500 }
    )
  }
}