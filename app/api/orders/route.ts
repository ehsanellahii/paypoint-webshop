import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/orders
 * 
 * Replace this mock implementation with your actual backend API integration.
 * This endpoint should process orders and communicate with your order management system.
 */
export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json();

    if (!orderData.customer?.name || !orderData.customer?.phone || !orderData.customer?.email) {
      return NextResponse.json(
        { error: 'Missing required customer information' },
        { status: 400 }
      );
    }

    if (!orderData.items || orderData.items.length === 0) {
      return NextResponse.json(
        { error: 'Order must contain at least one item' },
        { status: 400 }
      );
    }

    if (!orderData.paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method is required' },
        { status: 400 }
      );
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockOrderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    console.log('New Order Received:', {
      orderId: mockOrderId,
      customer: orderData.customer,
      pickupTime: orderData.pickupTime,
      paymentMethod: orderData.paymentMethod,
      itemCount: orderData.items.length,
      total: orderData.total,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      orderId: mockOrderId,
      status: 'received',
      estimatedTime: orderData.pickupTime === 'asap' ? '15-20 minutes' : `Ready at ${orderData.pickupTime}`,
      message: 'Order received successfully',
      customer: orderData.customer,
      pickupTime: orderData.pickupTime,
      paymentMethod: orderData.paymentMethod,
      total: orderData.total,
      orderDate: orderData.orderDate
    }, { status: 201 });

  } catch (error) {
    console.error('Error processing order:', error);
    return NextResponse.json(
      { error: 'Failed to process order', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders
 * 
 * Replace this mock implementation with your actual backend API integration.
 * This endpoint should fetch order status from your order management system.
 */
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('id');

  if (!orderId) {
    return NextResponse.json(
      { error: 'Order ID is required' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    orderId,
    status: 'preparing',
    estimatedTime: '10-15 minutes',
    items: []
  });
}
