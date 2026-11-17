import Foundation
import AVFoundation
import ImageIO
import CoreGraphics
import CoreVideo

func fail(_ message: String) -> NSError {
    NSError(domain: "InvitationMP4", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
}

func run() throws {
    let directory = URL(fileURLWithPath: CommandLine.arguments[1])
    let output = URL(fileURLWithPath: CommandLine.arguments[2])
    let width = Int(CommandLine.arguments[3])!
    let height = Int(CommandLine.arguments[4])!
    let fps = Int32(CommandLine.arguments[5])!
    let count = Int(CommandLine.arguments[6])!
    if FileManager.default.fileExists(atPath: output.path) { try FileManager.default.removeItem(at: output) }
    let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
    writer.shouldOptimizeForNetworkUse = true
    let track = AVAssetWriterInput(mediaType: .video, outputSettings: [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height,
        AVVideoColorPropertiesKey: [
            AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
            AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
            AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2,
        ],
        AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: 24_000_000,
            AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
            AVVideoExpectedSourceFrameRateKey: fps,
            AVVideoMaxKeyFrameIntervalKey: fps * 2,
        ],
    ])
    track.expectsMediaDataInRealTime = false
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: track, sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height,
        kCVPixelBufferCGImageCompatibilityKey as String: true,
        kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
    ])
    guard writer.canAdd(track) else { throw fail("Cannot add video track") }
    writer.add(track)
    guard writer.startWriting() else { throw writer.error ?? fail("Cannot start MP4 encoder") }
    writer.startSession(atSourceTime: .zero)
    for index in 0..<count {
        let start = Date()
        while !track.isReadyForMoreMediaData {
            if writer.status == .failed { throw writer.error! }
            if Date().timeIntervalSince(start) > 30 { throw fail("Video encoder timed out") }
            Thread.sleep(forTimeInterval: 0.005)
        }
        try autoreleasepool {
            let url = directory.appendingPathComponent(String(format: "%04d.png", index))
            guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
                  let image = CGImageSourceCreateImageAtIndex(source, 0, nil),
                  image.width == width, image.height == height else { throw fail("Invalid frame \(index)") }
            var optionalBuffer: CVPixelBuffer?
            guard let pool = adaptor.pixelBufferPool,
                  CVPixelBufferPoolCreatePixelBuffer(nil, pool, &optionalBuffer) == kCVReturnSuccess,
                  let buffer = optionalBuffer else { throw fail("Cannot allocate video frame") }
            CVPixelBufferLockBaseAddress(buffer, [])
            defer { CVPixelBufferUnlockBaseAddress(buffer, []) }
            guard let context = CGContext(data: CVPixelBufferGetBaseAddress(buffer), width: width, height: height,
                bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
                space: CGColorSpace(name: CGColorSpace.sRGB)!,
                bitmapInfo: CGBitmapInfo.byteOrder32Little.rawValue | CGImageAlphaInfo.premultipliedFirst.rawValue)
                else { throw fail("Cannot draw video frame") }
            context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
            guard adaptor.append(buffer, withPresentationTime: CMTime(value: Int64(index), timescale: fps))
                else { throw writer.error ?? fail("Cannot encode frame \(index)") }
        }
        if index % Int(fps) == 0 { print("Encoded \(index)/\(count)") }
    }
    writer.endSession(atSourceTime: CMTime(value: Int64(count), timescale: fps))
    track.markAsFinished()
    let finished = DispatchSemaphore(value: 0)
    writer.finishWriting { finished.signal() }
    finished.wait()
    guard writer.status == .completed else { throw writer.error ?? fail("Cannot finish MP4") }

    // Read back the encoded movie, count its real frames and save decoded
    // samples for checking crop, orientation, text quality and motion.
    let asset = AVURLAsset(url: output)
    let reader = try AVAssetReader(asset: asset)
    guard let video = asset.tracks(withMediaType: .video).first else { throw fail("Missing video track") }
    let decoded = AVAssetReaderTrackOutput(track: video, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
    reader.add(decoded)
    guard reader.startReading() else { throw reader.error ?? fail("Cannot verify MP4") }
    var frames = 0
    while decoded.copyNextSampleBuffer() != nil { frames += 1 }
    guard reader.status == .completed, frames == count else { throw fail("MP4 frame count mismatch: \(frames)") }
    let generator = AVAssetImageGenerator(asset: asset)
    generator.requestedTimeToleranceBefore = .zero
    generator.requestedTimeToleranceAfter = .zero
    for seconds in [0, 1, 4, 7] {
        let image = try generator.copyCGImage(at: CMTime(seconds: Double(seconds), preferredTimescale: fps), actualTime: nil)
        let preview = output.deletingPathExtension().appendingPathExtension("check-\(seconds)s.png")
        guard let destination = CGImageDestinationCreateWithURL(preview as CFURL, "public.png" as CFString, 1, nil) else { throw fail("Cannot save preview") }
        CGImageDestinationAddImage(destination, image, nil)
        guard CGImageDestinationFinalize(destination) else { throw fail("Cannot finish preview") }
    }
    print("Verified MP4: \(width)x\(height), \(frames) frames, \(video.nominalFrameRate) fps, \(CMTimeGetSeconds(asset.duration)) seconds")
}

do { try run() } catch { fputs("Export failed: \(error)\n", stderr); exit(1) }
