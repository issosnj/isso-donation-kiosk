import SwiftUI

struct DeviceActivationView: View {
    @EnvironmentObject var appState: AppState
    @State private var deviceCode = ""
    @State private var isActivating = false
    @State private var errorMessage: String?
    
    var body: some View {
        VStack(spacing: 40) {
            Image(systemName: "qrcode.viewfinder")
                .font(.system(size: 80))
                .foregroundColor(.blue)
            
            Text("Enter Device Code")
                .font(.largeTitle)
                .fontWeight(.bold)
            
            Text("Enter the 8-character device code provided by your administrator")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            TextField("Device Code", text: $deviceCode)
                .textFieldStyle(.roundedBorder)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
                .font(.title2)
                .frame(maxWidth: 300)
                .onChange(of: deviceCode) { newValue in
                    deviceCode = String(newValue.prefix(8).uppercased())
                }
            
            if let error = errorMessage {
                Text(error)
                    .foregroundColor(.red)
                    .padding()
            }
            
            Button(action: activateDevice) {
                if isActivating {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text("Activate Device")
                        .font(.headline)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(deviceCode.count != 8 || isActivating)
        }
        .padding()
    }
    
    private func activateDevice() {
        guard deviceCode.count == 8 else { return }
        
        isActivating = true
        errorMessage = nil
        
        Task {
            do {
                try await appState.activate(deviceCode: deviceCode)
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isActivating = false
                }
            }
        }
    }
}

