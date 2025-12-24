import SwiftUI

struct LoadingView: View {
    @EnvironmentObject var appState: AppState
    @State private var rotationAngle: Double = 0
    @State private var pulseScale: CGFloat = 1.0
    @State private var animationTimer: Timer?
    
    // Helper function to convert hex string to Color (same as KioskHomeView)
    private func colorFromHex(_ hex: String) -> Color {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if hexSanitized.hasPrefix("#") {
            hexSanitized.removeFirst()
        }
        
        if hexSanitized.count == 3 {
            hexSanitized = hexSanitized.map { String($0) + String($0) }.joined()
        }
        
        guard hexSanitized.count == 6,
              let rgb = UInt32(hexSanitized, radix: 16) else {
            return Color(red: 0.26, green: 0.20, blue: 0.20) // Default #423232
        }
        
        let red = Double((rgb >> 16) & 0xFF) / 255.0
        let green = Double((rgb >> 8) & 0xFF) / 255.0
        let blue = Double(rgb & 0xFF) / 255.0
        
        return Color(red: red, green: green, blue: blue)
    }
    
    // Background view (same as KioskHomeView)
    @ViewBuilder
    private func backgroundView(geometry: GeometryProxy) -> some View {
        if UIImage(named: "KioskBackground") != nil {
            Image("KioskBackground")
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: geometry.size.width, height: geometry.size.height)
                .clipped()
                .ignoresSafeArea(.all)
        } else {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.white,
                    Color(red: 0.95, green: 0.97, blue: 1.0)
                ]),
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea(.all)
        }
    }
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Background
                backgroundView(geometry: geometry)
                    .ignoresSafeArea(.all)
                
                // Loading content
                VStack(spacing: 40) {
                    Spacer()
                    
                    // Animated spinner with theme colors
                    ZStack {
                        // Outer rotating circle
                        Circle()
                            .trim(from: 0.0, to: 0.7)
                            .stroke(
                                colorFromHex("423232"),
                                style: StrokeStyle(lineWidth: 8, lineCap: .round)
                            )
                            .frame(width: 80, height: 80)
                            .rotationEffect(.degrees(rotationAngle))
                            .animation(.linear(duration: 1.0).repeatForever(autoreverses: false), value: rotationAngle)
                        
                        // Inner pulsing circle
                        Circle()
                            .fill(colorFromHex("423232").opacity(0.3))
                            .frame(width: 60, height: 60)
                            .scaleEffect(pulseScale)
                            .animation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true), value: pulseScale)
                    }
                    .padding(.bottom, 20)
                    
                    // Loading text
                    VStack(spacing: 12) {
                        Text("Kiosk Starting Up")
                            .font(.custom("Inter-SemiBold", size: 42))
                            .foregroundColor(colorFromHex("423232"))
                            .multilineTextAlignment(.center)
                        
                        Text("Please Wait")
                            .font(.custom("Inter-Medium", size: 28))
                            .foregroundColor(colorFromHex("423232").opacity(0.8))
                            .multilineTextAlignment(.center)
                    }
                    .padding(.horizontal, 40)
                    
                    Spacer()
                }
            }
        }
        .onAppear {
            // Start rotation animation - continuously rotate
            rotationAngle = 360
            pulseScale = 1.2
            
            // Use timer to continuously update rotation for smooth animation
            animationTimer = Timer.scheduledTimer(withTimeInterval: 0.016, repeats: true) { _ in
                withAnimation(.linear(duration: 0.016)) {
                    rotationAngle += 6 // 6 degrees per frame (360/60fps)
                    if rotationAngle >= 360 {
                        rotationAngle = 0
                    }
                }
            }
        }
        .onDisappear {
            // Clean up timer
            animationTimer?.invalidate()
            animationTimer = nil
        }
    }
}

