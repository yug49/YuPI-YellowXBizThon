import { NextRequest, NextResponse } from 'next/server'

// This is a simple proxy to the backend API
// In production, you might want to add authentication, rate limiting, etc.

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001'

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/orders`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch orders')
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const response = await fetch(`${BACKEND_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create order')
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create order' },
      { status: 500 }
    )
  }
}